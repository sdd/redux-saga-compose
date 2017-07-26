# redux-saga-compose

[![Build Status](https://travis-ci.org/sdd/redux-saga-compose.svg?branch=master)](https://travis-ci.org/sdd/redux-saga-compose)

Small utility for redux-saga to allow composing of middleware sagas, in the style of koa-compose

## Rationale

For 95% of sagas, you won't need this. This module is intended for use when redux-saga is used in order to orchestrate a very complex data pipeline.

For example, you need to:

 * take an action, 
 * build a complex request object by merging and transforming different bits of the action and state,
 * `put`ting actions pre- and post- request to trigger UI changes,
 * transforming the response from the server (based on more things that you might need from state / originating action),
 * and finally `put` an action containing the response,
 * wrapping the whole lot to catch errors.
 
This module allows you to compose sagas that conform to a specific middleware signature (similar to that used by koa's middleware) into a single saga (that is itself composible, should you need to go all inception-style deep).

## Middleware

```javascript
// the simplest, do nothing, pass-through middleware
function * (request, next) {
    return (yield call(next, request));
}
```

```javascript
function * (request, next) {

   // do something to enrich the request on the way down the middleware stack:
   const updatedRequest = {
       ...request,
       stuff: "now with added stuff"
   };
   
   // pass the request down the stack:
   const response = yield call(next, updatedRequest);
   
   // do something to the response on the way back up:
   return {
       ...response,
       thing: "new improved response with extra thinginess!"
   };
}
```

## Usage

We will build a saga that listens for REQUEST_DATA actions and inject them into our middleware pipeline.
```javascript

import { takeLatest } from 'redux-saga';
import reduxSagaCompose from 'redux-saga-compose';

const requestPipeline = reduxSagaCompose([
  
  // these do things pre-request and post-response, wrapping the whole stack.
  handleLoadingUI,
  errorHandlerWrapper,
  
  // transforms the request on the way down
  transformRequest,
  
  // transform the response on the way back up (so dispatch happens AFTER transform)
  dispatchResponseAction,
  transformResponse,
  
  // the u-bend at the bottom of the stack
  makeRequest
]);

export default function * () {
    yield* takeLatest(REQUEST_DATA, requestPipeline);
}

```

## More Examples

For now, check out the tests for implementation. Adding a good example to this Readme is on my todo list :-)
