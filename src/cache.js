const map = new WeakMap()
const wm = o => map.get(o)

const requires = (i, args) => {
  if (args.length < i)
    throw new TypeError(`${i} argument required, but only ${args.length} present.`)
}

const isReq = req => req && req instanceof Request
const isRes = res => res && res instanceof Response

function openDB() {
  return new Promise(rs => {
    // Open (or create) the database
    const open = indexedDB.open('cachestorage', 4)
    // Create the schema
    open.onupgradeneeded = () => {
      const db = open.result;
      // cointains all storage containsers
      db.createObjectStore('storages', { keyPath: 'cacheName' })
      // contains all cache of request and responses
      const cacheStore = db.createObjectStore('caches', { autoIncrement: true })
      cacheStore.createIndex('cacheName', 'cacheName', { unique: false })
    }

    open.onsuccess = () => {
      // Start a new transaction
      rs(open.result);
    }
  })
}

class Cache {
  constructor(cacheName) {
    map.set(this, cacheName)
  }

  /**
   * Returns a Promise that resolves to the response associated
   * with the first matching request in the Cache object.
   *
   * @param  {[type]}  args [description]
   * @return {Promise}      [description]
   */
  async match(...args) {
    return (await this.matchAll(...args))[0]
  }

  // Returns a Promise that resolves to an array
  // of all matching requests in the Cache object.
  async matchAll(req, options = {}) {
    if (req.method === 'HEAD') return []

    const cacheName = wm(this)
    const db = await openDB()
    const result = []

    // Start a new transaction
    const tx = db.transaction('caches', 'readonly')
    const caches = tx.objectStore('caches')
    const index = caches.index('cacheName')
    const request = index.openCursor(IDBKeyRange.only(cacheName));
    request.onsuccess = function() {
      let cursor = this.result;

      if (cursor) {
        if ((req.url || req) === cursor.value.reqUrl) {
          const initData = Object.assign({
            url: cursor.value.resUrl
          }, cursor.value)

          const res = new Response(cursor.value.body, initData)
          result.push(res)
        }
        cursor.continue();
      }
    }

    return new Promise(rs =>
      tx.oncomplete = () => rs(result)
    )
  }

  // Takes a URL, retrieves it and adds the resulting response
  // object to the given cache. This is fuctionally equivalent
  // to calling fetch(), then using put() to add the results to the cache
  async add(request) {
    requires(1, arguments)
    return this.addAll([request])
  }

  // Takes an array of URLs, retrieves them, and adds the
  // resulting response objects to the given cache.
  async addAll(requests) {
    requires(1, arguments)

    let results = []

    for (let req of requests) {
      req = new Request(req)

      if (!/^((http|https):\/\/)/.test(req.url))
        throw new TypeError(`Add/AddAll does not support schemes other than "http" or "https"`)

      if (req.method !== 'GET')
        throw new TypeError(`Add/AddAll only supports the GET request method`)

      let clone = req.clone()

      await fetch(req).then(res => {
        if (res.status === 206)
          throw new TypeError('Partial response (status code 206) is unsupported')

        if (!res.ok)
          throw new TypeError('Request failed')

        results.push([req, res])
      })
    }

    await Promise.all(results.map(a => this.put(...a)))
  }


  /**
   * Takes both a request and its response and adds it to the given cache.
   *
   * @param  {Request|String}  req  [description]
   * @param  {Response}        res  [description]
   * @return {Promise}              [description]
   */
  async put(req, res) {
    requires(2, arguments)

    req = isReq(req) ? req : new Request(req)

    await this.delete(req)

    if (!/^((http|https):\/\/)/.test(req.url))
      throw new TypeError(`Request scheme '${req.url.split(':')[0]}' is unsupported`)

    if (req.method !== 'GET')
      throw new TypeError(`Request method '${req.method}' is unsupported`)

    if (res.status === 206)
      throw new TypeError('Partial response (status code 206) is unsupported')

    let varyHeaders = res.headers.get('Vary')

    if (varyHeaders && varyHeaders.includes('*'))
      throw new TypeError('Vary header contains *')

    if (res.body != null)
      if (res.bodyUsed)
        throw new TypeError('Response body is already used')

    let folder = wm(this)
    let cache = {
      cacheName: folder,
      headers: [...res.headers],
      status: res.status,
      statusText: res.statusText,
      body: await res.arrayBuffer(),
      reqUrl: req.url.replace(/#.*$/,''),
      resUrl: res.url.replace(/#.*$/,''),
      reqMethod: req.method
    }

    const db = await openDB()

    await new Promise((rs, rj) => {
      const tx = db.transaction('caches', 'readwrite')
      const store = tx.objectStore('caches')

      // Add some data
      store.put(cache);

      tx.oncomplete = () => rs()
      tx.onerror = () => rj(transaction.error)
    })
  }

  // Finds the Cache entry whose key is the request, and if found,
  // deletes the Cache entry and returns a Promise that resolves to true.
  // If no Cache entry is found, it returns false.
  async delete(request, options = {}) {
    requires(1, arguments)
    const cacheName = wm(this)

    const { ignoreMethod } = options
    const r = isReq(request) ? request : new Request(request)
    if (!['GET', 'HEAD'].includes(r.method) && ignoreMethod)
      return false

    const { method } = r
    const url = r.url.replace(/#.*$/,'')
    const db = await openDB()

    // Start a new transaction
    const tx = db.transaction('caches', 'readwrite')
    const caches = tx.objectStore('caches')
    const index = caches.index('cacheName')
    const query = index.openCursor(IDBKeyRange.only(cacheName));

    let deleted = false

    query.onsuccess = function() {
      const cursor = this.result;

      if (cursor) {
        if (url === cursor.value.reqUrl && (ignoreMethod || method === cursor.value.reqMethod)) {
          deleted = true
          caches.delete(cursor.primaryKey)
        }
        cursor.continue();
      }
    }

    return new Promise(rs =>
      tx.oncomplete = () => rs(deleted)
    )
  }

  // Returns a Promise that resolves to an array of Cache keys.
  async keys(request, options = {}) {
    let url
    const folder = wm(this)
    const {
      ignoreMethod = false,
      ignoreSearch = false
    } = options

    // using new Request to normalize fragment and trailing slash
    if (request !== undefined) {
      request = new Request(request)

      url = request.url.split('#')[0]

      if (request.method !== 'GET' && !ignoreMethod) return []
    }

    const search = request === undefined ? a => a : a => a.filter(a => {
      if (ignoreSearch) {
        a = a.reqUrl.split('?')[0]
        url = url.split('?')[0]
      } else {
        a = a.reqUrl
      }

      return a === url
    })

    const db = await openDB()

    const responses = await new Promise(rs => {
      const tx = db.transaction('caches', 'readonly')
      const store = tx.objectStore('caches')
      const cacheName = store.index('cacheName');
      const request = cacheName.getAll(IDBKeyRange.only(folder))
      request.onsuccess = () => rs(request.result)
    })

    return search(responses).map(response => new Request(response.reqUrl))
  }
}

module.exports = Cache
