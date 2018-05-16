var stream = str => str

describe('cache-keys', () => {
  const {Cache, CacheStorage, caches} = cachePolyfill

  // beforeEach(() => caches.delete('v1'))
  afterEach(() => caches.delete('v1'))

  it('Cache.keys() called on an empty cache', async () => {
    let cache = await caches.open('v1')
    let keys = await cache.keys()
    console.assert(keys.length === 0, 'Cache.keys should resolve to an empty array for an empty cache')
  })

  it('Cache.keys() called on an empty cache', async () => {
    let cache = await caches.open('v1')
    let keys = await cache.keys()
    console.assert(keys.length === 0, 'Cache.keys should resolve to an empty array for an empty cache')
  })

  it('Cache.keys with no matching entries', async () => {
    let cache = await caches.open('v1')
    await cache.put(new Request('https://httpbin.org/get'), new Response)
    let keys = await cache.keys('not-present-in-the-cache')
    console.assert(keys.length === 0, 'Cache.keys should resolve with an empty array on failure.')
  })

  it('Cache.keys with URL', async () => {
    let cache = await caches.open('v1')
    await cache.put(new Request('https://httpbin.org/get'), new Response)
    let keys = await cache.keys('https://httpbin.org/get')
    console.assert(keys.length === 1, 'Cache.keys should match by URL.')
  })

  it('Cache.keys with Request', async () => {
    let cache = await caches.open('v1')
    let req = new Request('http://example.com/foo')
    await cache.put(req, new Response)
    let keys = await cache.keys(req)
    console.assert(keys.length === 1, 'Cache.keys should match by Request.')
  })

  it('Cache.keys with new Request', async () => {
    let cache = await caches.open('v1')
    let req = new Request('http://example.com/foo')
    await cache.put(req, new Response)
    let keys = await cache.keys(new Request(req))
    console.assert(keys.length === 1, 'Cache.keys should match by Request.')
  })

  it('Cache.keys with ignoreSearch option (request with no search parameters)', async () => {
    let cache = await caches.open('v1')

    await cache.put(new Request('https://httpbin.org/ip'), new Response)
    await cache.put(new Request('https://httpbin.org/get'), new Response)
    await cache.put(new Request('https://httpbin.org/get?foo=bar'), new Response)

    let keys = await cache.keys('https://httpbin.org/get', {ignoreSearch: true})
    console.assert(keys.length === 2, 'Cache.keys should match by Request.')
  })

  it('Cache.keys with ignoreSearch option (request with search parameters)', async () => {
    await caches.delete('v1')
    let cache = await caches.open('v1')

    await cache.put(new Request('https://httpbin.org/ip'), new Response)
    await cache.put(new Request('https://httpbin.org/get'), new Response)
    await cache.put(new Request('https://httpbin.org/get?foo=bar'), new Response)

    let keys = await cache.keys('https://httpbin.org/get?bar=baz', {ignoreSearch: true})
    console.assert(keys.length === 2, 'Cache.keys with ignoreSearch should ignore the search parameters of request.')
  })

  it('Cache.keys supports ignoreMethod', async () => {
    let cache = await caches.open('v1')
    let request = new Request('http://example.com/')
    let head_request = new Request('http://example.com/', {method: 'HEAD'})
    let response = new Response
    await cache.put(request.clone(), response.clone())

    let result = await cache.keys(head_request.clone())
    console.assert(result.length === 0, 'Cache.keys should resolve with an empty array with a mismatched method.')
    result = await cache.keys(head_request.clone(), {ignoreMethod: true})
    console.assert(result.length === 1, 'Cache.keys with ignoreMethod should ignore the method of request.')
  })

  it.skip('Cache.keys supports ignoreVary', async () => {
    let keys
    let cache = await caches.open('v1')
    let vary_request = new Request('http://example.com/c', {headers: {'Cookies': 'is-for-cookie'}})
    let vary_response = new Response(stream('hi'), {headers: {'Vary': 'Cookies'}})
    let mismatched_vary_request = new Request('http://example.com/c')

    await cache.put(vary_request.clone(), vary_response.clone())
    keys = await cache.keys(mismatched_vary_request.clone())
    console.assert(keys.length === 0, 'Cache.keys should resolve with an empty array with a mismatched vary.')
    keys = await cache.keys(mismatched_vary_request.clone(), {ignoreVary: true})
    console.assert(keys.length === 1, 'Cache.keys with ignoreVary should ignore the vary of request.')
  })

  it('Cache.keys with URL containing fragment', async () => {
    let cache = await caches.open('v1')
    await cache.put(new Request('http://example.com/'), new Response)
    let keys = await cache.keys('http://example.com/#fragment')
    console.assert(keys.length === 1, 'Cache.keys should ignore URL fragment.')
  })

  it('Cache.keys without parameters', async () => {
    let cache = await caches.open('v1')
    await cache.put(new Request('http://example.com/'), new Response)
    await cache.put(new Request('http://example.com/foo'), new Response)
    await cache.put(new Request('http://example.com/bar'), new Response)
    let keys = await cache.keys()
    console.assert(keys.length === 3, 'Cache.keys without parameters should match all entries.')
  })
})
