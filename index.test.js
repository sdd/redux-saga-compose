const { expect } = require('chai');
const _ = require('lodash');
const { call } = require('redux-saga/effects');

const reduxSagaCompose = require('./index');

describe('composeSagaMiddleware', () => {

    it('throws if arg is not an array', () => {

        expect(() => {
            reduxSagaCompose()
        }).to.throw();

        expect(() => {
            reduxSagaCompose(function() {})
        }).to.throw();

    });

    it('throws if any middleware is not a function', () => {

        expect(() => {
            reduxSagaCompose([
                function() {},
                function * () {},
                'not a function!'
            ])
        }).to.throw();

    });

    it('should flow calls through the middleware stack correctly', () => {

        // example middleware that enriches a request with the query time
        const testMiddleware1 = function * (req, next) {
            const startTime = '12:00:00.0000';

            const result = yield call(next, req);

            yield {
                data: result,
                requestDuration: `12:00:00.1000 - ${ startTime }`
            };
        };

        // example middleware that filters args
        const testMiddleware2 = function * (req, next) {
            const downstreamArg = _.filter(req, 'enabled');

            yield (yield call(next, downstreamArg));
        };

        // example middleware that tranforms responses
        const testMiddleware3 = function * (req, next) {
            const result = yield call(next, req);

            yield result.map(x => Object.assign({}, x, { id: `id-${ x.responseId }` }));
        };

        // example middleware that retrieves data at the bottom of the stack
        const testMiddleware4 = function * (req) {
            const result = yield call(apiRequest, req);

            yield result;
        };

        // mocked api request function
        function apiRequest(req) {
            return req.map(({ id }) => ({ responseId: id }));
        }

        const middleware = [
            testMiddleware1,
            testMiddleware2,
            testMiddleware3,
            testMiddleware4
        ];

        const request = [
            { id: 1, enabled: true },
            { id: 2, enabled: false },
            { id: 3, enabled: true }
        ];

        let val;
        const saga1 = reduxSagaCompose(middleware)(request);

        val = saga1.next().value;
        expect(val.CALL.fn.wrapee).to.eql(testMiddleware2);
        expect(val.CALL.args).to.eql([request]);

        const saga2 = val.CALL.fn(...val.CALL.args);
        val = saga2.next().value;
        expect(val.CALL.fn.wrapee).to.eql(testMiddleware3);
        expect(val.CALL.args).to.eql([[{ id: 1, enabled: true }, { id: 3, enabled: true }]]);

        const saga3 = val.CALL.fn(...val.CALL.args);
        val = saga3.next().value;
        expect(val.CALL.fn.wrapee).to.eql(testMiddleware4);
        expect(val.CALL.args).to.eql([[{ id: 1, enabled: true }, { id: 3, enabled: true }]]);

        const saga4 = val.CALL.fn(...val.CALL.args);
        val = saga4.next().value;
        expect(val).to.eql(call(apiRequest, [{ id: 1, enabled: true }, { id: 3, enabled: true }]));

        val = saga4.next([{ responseId: 1 }, { responseId: 3 }]).value;

        val = saga3.next(val).value;
        expect(val).to.eql([ { responseId: 1, id: 'id-1' }, { responseId: 3, id: 'id-3' } ]);

        val = saga2.next(val).value;
        expect(val).to.eql([ { responseId: 1, id: 'id-1' }, { responseId: 3, id: 'id-3' } ]);

        val = saga1.next(val).value;
        expect(val).to.eql({
            data: [
                { responseId: 1, id: 'id-1' },
                { responseId: 3, id: 'id-3' }
            ],
            requestDuration: `12:00:00.1000 - 12:00:00.0000`
        });

        expect(saga1.next().done).to.be.true;
    });
});
