var test_url = 'https://example.com/foo'

// Construct a generic Request object. The URL is |test_url|. All other fields are defaults.
function new_test_request() {
  return new Request(test_url);
}

// Construct a generic Response object.
function new_test_response() {
  return new Response('Hello world!', { status: 200 });
}

describe('cache-delete', () => {
  const {Cache, CacheStorage, caches} = cachePolyfill

  beforeEach(() => caches.delete('v1'))

  it('Cache.delete with no arguments', async () => {
    let cache = await caches.open('v1')
    let err = await cache.delete().catch(a => a)
    console.assert(err instanceof TypeError, 'Cache.delete should reject with a TypeError when called with no arguments.')
  })

  it('Cache.delete called with a string URL', async () => {
    let cache = await caches.open('v1')
    await cache.put(new_test_request(), new_test_response())
    let result = await cache.delete(test_url)
    console.assert(result, 'Cache.delete should resolve with "true" if an entry was successfully deleted.')
    let match = await cache.match(test_url)
    console.assert(match === undefined, 'Cache.delete should remove matching entries from cache.')
  })

  // Need node-fetch v2
  it('Cache.delete called with a Request object', async () => {
    let cache = await caches.open('v1')
    let request = new Request(test_url)
    await cache.put(request, new_test_response())
    let result = await cache.delete(request)
    console.assert(result, 'Cache.delete should resolve with "true" if an entry was successfully deleted.')
  })

  // Need node-fetch v2
  it('Cache.delete called with a HEAD request', async () => {
    let cache = await caches.open('v1')
    let request = new Request(test_url)
    let response = new_test_response()
    await cache.put(request, response)
    let result = await cache.delete(new Request(test_url, {method: 'HEAD'}))
    console.assert(result === false, 'Cache.delete should not match a non-GET request unless ignoreMethod option is set.')
    result = await cache.match(test_url)
    // assert_response_equals(result, response, 'Cache.delete should leave non-matching response in the cache.')
    result = await cache.delete(new Request(test_url, {method: 'HEAD'}), {ignoreMethod: true})
    console.assert(result === true, 'Cache.delete should match a non-GET request if ignoreMethod is true.')
  })

  // Need node-fetch v2
  it.skip('Cache.delete supports ignoreVary', async () => {
    let cache = await caches.open('v1')
    let vary_request = new Request('https://httpbin.org/get', {headers: {'Cookies': 'is-for-cookie'}})
    let vary_response = new Response('', {headers: {'Vary': 'Cookies'}})
    let mismatched_vary_request = new Request('https://httpbin.org/get')

    await cache.put(vary_request.clone(), vary_response.clone())
    let result = cache.delete(mismatched_vary_request.clone())
    console.assert(result === false, 'Cache.delete should not delete if vary does not match unless ignoreVary is true')
    result = await cache.delete(mismatched_vary_request.clone(), {ignoreVary: true});
    assert_true(result === true, 'Cache.delete should ignore vary if ignoreVary is true');
  })

  it('Cache.delete with a non-existent entry', async () => {
    let cache = await caches.open('v1')
    let result = await cache.delete(test_url)
    console.assert(result === false, 'Cache.delete should resolve with "false" if there are no matching entries.')
  })

})


/*
prepopulated_cache_test(simple_entries, function(cache, entries) {
    return cache.matchAll(entries.a_with_query.request, { ignoreSearch: true })
      .then(function(result) {
          assert_response_array_equals(
            result,
            [
              entries.a.response,
              entries.a_with_query.response
            ]);
          return cache.delete(entries.a_with_query.request,
                              { ignoreSearch: true });
        })
      .then(function(result) {
          return cache.matchAll(entries.a_with_query.request,
                                { ignoreSearch: true });
        })
      .then(function(result) {
          assert_response_array_equals(result, []);
        });
  },
  'Cache.delete with ignoreSearch option (request with search parameters)');

prepopulated_cache_test(simple_entries, function(cache, entries) {
    return cache.matchAll(entries.a_with_query.request,
                          { ignoreSearch: true })
      .then(function(result) {
          assert_response_array_equals(
            result,
            [
              entries.a.response,
              entries.a_with_query.response
            ]);
          // cache.delete()'s behavior should be the same if ignoreSearch is
          // not provided or if ignoreSearch is false.
          return cache.delete(entries.a_with_query.request,
                              { ignoreSearch: false });
        })
      .then(function(result) {
          return cache.matchAll(entries.a_with_query.request,
                                { ignoreSearch: true });
        })
      .then(function(result) {
          assert_response_array_equals(result, [ entries.a.response ]);
        });
  },
  'Cache.delete with ignoreSearch option (when it is specified as false)');
*/
