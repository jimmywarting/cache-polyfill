var test_url = 'https://example.com/foo';
var test_body = (body = 'Hello world!') => body

describe('cache-put', () => {
  const {Cache, CacheStorage, caches} = cachePolyfill
  
  beforeEach(() => caches.delete('v1'))

  it('Cache.put called with simple Request and Response', async () => {
    var request = new Request(test_url)
    var response = new Response(test_body())
    let cache = await caches.open('v1')
    let result = await cache.put(request, response)
    console.assert(result === undefined, 'Cache.put should resolve with undefined on success.')
  })

  it('Cache.put called with Request and Response from fetch()', async () => {
    let cache = await caches.open('v1')
    let test_url = 'https://httpbin.org/get?echo=foo'
    let request = new Request(test_url)
    let fetch_result = await fetch(request)
    let response = fetch_result.clone()
    await cache.put(request, fetch_result)
    let match = await cache.match(test_url)
    let bodies = Promise.all([match.text(), response.text()])
    console.assert(bodies[0] === bodies[1], 'Cache.put should have the same body')
  })

  it('Cache.put with Request without a body', async () => {
    let cache = await caches.open('v1')
    let request = new Request(test_url)
    let response = new Response(test_body())
    console.assert(request.bodyUsed === false, '[https://fetch.spec.whatwg.org/#dom-body-bodyused] Request.bodyUsed should be initially false.')
    await cache.put(request, response)
    console.assert(request.bodyUsed === false, `Cache.put should not mark empty request's body used`);
  })

  it('Cache.put with an empty response body', async () => {
    let cache = await caches.open('v1')
    let request = new Request(test_url)
    let response = new Response('hej', {
        status: 200,
        headers: [['Content-Type', 'text/plain']]
    })
    await cache.put(request, response)
    let result = await cache.match(test_url)
    let body = await result.text()
    console.assert(result.status === 200, 'Cache.put should store status.')
    console.assert(result.headers.get('Content-Type') === 'text/plain', 'Cache.put should store headers.')
    console.assert(body === 'hej', 'Cache.put should store response body.')
  })

  it('Cache.put with HTTP 500 response', async () => {
    let cache = await caches.open('v1')
    let test_url = 'https://httpbin.org/status/500'
    let request = new Request(test_url)
    let fetch_result = await fetch(test_url)
    console.assert(fetch_result.status === 500, 'Test framework error: The status code should be 500.')
    let response = fetch_result.clone()
    await cache.put(request, fetch_result)
    let result = await cache.match(test_url)
    console.assert(result.status === 500, 'Test framework error: The status code should be 500.')
    let body = await result.text()
    console.assert(body === '', 'Cache.put should store response body.')
  })

  it('Cache.put with HTTP 206 response', async () => {
    let cache = await caches.open('v1')
    let request = new Request('https://httpbin.org/status/206')
    let response = new Response('part...', {status: 206})
    let err = await cache.put(request, response).catch(a => a)
    console.assert(err instanceof TypeError, 'Cache.put should reject partial response')
  })

  it('Cache.put called twice with matching Requests and different Responses', async () => {
    let cache = await caches.open('v1')
    let alternate_response_body = 'New body'
    let alternate_response = new Response(alternate_response_body, { statusText: 'New status' })
    await cache.put(new Request(test_url), new Response('Old body', { statusText: 'Old status' }))
    await cache.put(new Request(test_url), alternate_response.clone())
    let result = await cache.match(test_url)
    let body = await result.text()
    console.assert(body === alternate_response_body, 'Cache put should store new response body.')
  })

  it('Cache.put called twice with request URLs that differ only by a fragment', async () => {
    let cache = await caches.open('v1')
    var test_url = 'https://example.com/foo';
    let first_url = test_url
    let second_url = first_url + '#(O_o)'
    let alternate_response_body = 'New body'
    let alternate_response = new Response(test_body(alternate_response_body), { statusText: 'New status' })

    await cache.put(new Request(first_url), new Response(test_body('Old body'), { statusText: 'Old status' }))
    await cache.put(new Request(second_url), alternate_response.clone())
    let result = await cache.match(test_url)
    let body = await result.text()
    console.assert(body === 'New body', 'Cache.put should replace existing response with new response.')
  })

  it('Cache.put with a string request', async () => {
    let cache = await caches.open('v1')
    let url = 'http://example.com/foo';
    await cache.put(url, new Response(test_body('some body')))
    let response = await cache.match(url)
    let body = await response.text()
    console.assert(body === 'some body', 'Cache.put should accept a string as request.')
  })

  it('Cache.put with an invalid response', async () => {
    let cache = await caches.open('v1')
    let err = await cache.put(new Request(test_url), 'Hello world!').catch(a => a)
    console.assert(err instanceof TypeError, 'Cache.put should only accept a Response object as the response.')
  })

  it('Cache.put with a non-HTTP/HTTPS request', async () => {
    let cache = await caches.open('v1')
    let err = await cache.put(new Request('file:///etc/passwd'), new Response(test_body())).catch(a => a)
    console.assert(err instanceof TypeError, 'Cache.put should reject non-HTTP/HTTPS requests with a TypeError.')
  })

  it('Cache.put with a non-GET request', async () => {
    let cache = await caches.open('v1')
    var request = new Request('http://example.com/foo', { method: 'HEAD' })
    let err = await cache.put(request, new Response(test_body)).catch(a => a)
    console.assert(err instanceof TypeError, 'Cache.put should throw a TypeError for non-GET requests.')
  })

  it('Cache.put with a null response', async () => {
    let cache = await caches.open('v1')
    let err = await cache.put(new Request(test_url), null).catch(a => a)
    console.assert(err instanceof TypeError, 'Cache.put should throw a TypeError for a null response.')
  })

  it('Cache.put with a POST request', async () => {
    let cache = await caches.open('v1')
    var request = new Request(test_url, {method: 'POST', body: test_body()});
    let err = await cache.put(request, new Response(test_body())).catch(a => a)
    console.assert(err instanceof TypeError, 'Cache.put should throw a TypeError for a POST request.')
  })

  it('Cache.put with a used response body', async () => {
    let cache = await caches.open('v1')
    var response = new Response(test_body());
    console.assert(response.bodyUsed === false, '[https://fetch.spec.whatwg.org/#dom-body-bodyused] Response.bodyUsed should be initially false.')
    await response.text()
    console.assert(response.bodyUsed === true, '[https://fetch.spec.whatwg.org/#concept-body-consume-body] The text() method should make the body disturbed.')
    var request = new Request(test_url)
    let err = await cache.put(request, response).catch(a => a)
    console.assert(err instanceof TypeError, 'Cache.put should be rejected')
  })

  it('Cache.put with a VARY:* Response', async () => {
    let cache = await caches.open('v1')
    let req = new Request(test_url)
    let res = new Response(test_body(), { headers: { VARY: '*' }})
    let err = await cache.put(req, res).catch(a => a)
    console.assert(err instanceof TypeError, 'Cache.put should reject VARY:* Responses with a TypeError.')
  })

  it.skip('Cache.put with an embedded VARY:* Response', async () => {
    let cache = await caches.open('v1')
    let req = new Request(test_url)
    let res = new Response(test_body(), { headers: { VARY: 'Accept-Language,*' }})
    let err = await cache.put(req, res).catch(a => a)
    console.assert(err instanceof TypeError, 'Cache.put should reject Responses with an embedded VARY:* with a TypeError.')
  })
})
