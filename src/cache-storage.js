const Cache = require('./cache')

function openDB() {
  return new Promise(rs => {
    // Open (or create) the database
    const open = indexedDB.open('cachestorage', 4)
    // Create the schema
    open.onupgradeneeded = function() {
      const db = open.result;
      // cointains all storage containsers
      db.createObjectStore('storages', {keyPath: 'cacheName'})
      // contains all cache of request and responses
      const cacheStore = db.createObjectStore('caches', { autoIncrement: true })
      const e = cacheStore.createIndex('cacheName', 'cacheName', { unique: false })
    }

    open.onsuccess = () => {
      // Start a new transaction
      rs(open.result);
    }
  })
}

class CacheStorage {

  /**
   * [delete description]
   * @return {[type]} [description]
   */
  async delete(cacheName) {
    // Should resolve to false if there is nothing to delete
    const keys = await this.keys()
    if (!keys.includes(cacheName)) {
      return false
    }

    const db = await openDB()

    // Start a new transaction
    var tx = db.transaction(['storages', 'caches'], 'readwrite')
    var store = tx.objectStore('storages')
    var request = store.delete(cacheName)

    var caches = tx.objectStore('caches')
    var index = caches.index('cacheName')
    var request = index.getAllKeys(IDBKeyRange.only(cacheName));

    request.onsuccess = function(tx) {
      for (let key of this.result) {
        caches.delete(key)
      }
    }

    return new Promise((rs, rj) => {
      tx.oncomplete = () => rs(true)
      tx.onerror = () => rj(false)
    })
  }


  /**
   * [has description]
   * @return {Boolean} [description]
   */
  has(cacheName) {
    return this.keys().then(keys => keys.includes(cacheName))
  }


  /**
   * resolves with an array containing strings corresponding to all of the named
   * Cache objects tracked by the CacheStorage.
   * Use this method to iterate over a list of all the Cache objects.
   *
   * @return <Promise>Array keyList
   */
  async keys() {
    const db = await openDB()

    // Start a new transaction
    var tx = db.transaction('storages', 'readonly')
    var store = tx.objectStore('storages')
    var keys = store.getAllKeys()

    return new Promise(rs =>
      keys.onsuccess = () => rs(keys.result)
    )
  }


  /**
   * Checks if a given Request is a key in any of the Cache objects
   * that the CacheStorage object tracks and returns a Promise that
   * resolves to that match.
   *
   * @return Promise
   */
  async match(...args) {
    let keys = await this.keys()

    for (let key of keys) {
      let cache = await this.open(key)
      let result = await cache.match(...args)
      if (result) return result
    }
  }


  /**
   * Resolves to the Cache object matching the cacheName
   * (a new cache is created if it doesn't exist.)
   *
   * @return {[type]} [description]
   */
  async open(cacheName) {
    if (arguments.length < 1)
      throw new TypeError(`${i} argument required, but only ${arguments.length} present.`)

    const db = await openDB()
    await new Promise((rs, rj) => {
      const tx = db.transaction('storages', 'readwrite')
      const store = tx.objectStore('storages')

      // Add some data
      store.put({ cacheName });

      tx.oncomplete = () => rs()
      tx.onerror = () => rj(transaction.error)
    })

    return new Cache(cacheName)
  }


  /**
   * [description]
   * @return {[type]} [description]
   */
  [Symbol.toStringTag]() {
    return 'CacheStorage'
  }
}

module.exports = {
  Cache,
  CacheStorage,
  caches: new CacheStorage
}
