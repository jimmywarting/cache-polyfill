# cache-polyfill
cache polyfill, Offline storage, Wraps IndexedDB, works without https/ssl

PWA builder!
This is for you who don't have a ssl or need to support older browser.

## Example Usage

```js
import {Cache, CacheStorage, caches} from 'cache-polyfill'
// import 'whatwg-fetch'

// example usage:
caches.open('v1').then(function(cache) {
  return cache.addAll([
    '/asset/index.html',
    '/asset/star-wars-logo.jpg',
    '/asset/gallery/bountyHunters.jpg',
    '/asset/gallery/myLittleVader.jpg',
    '/asset/gallery/snowTroopers.jpg'
  ]);
})

const request = new Request('/asset/component.tpl')
caches.match(request).then(response => {
  return response || fetch(request).then(response => {
    caches.open('v1').then(cache =>
      cache.put(event.request, response)
    )
    return response.clone();
  })
})
```

Documentation and more example over at [mozilla - Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
