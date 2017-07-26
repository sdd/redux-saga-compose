module.exports = function(middleware) {

    if (!Array.isArray(middleware)) {
        throw new Error('argument must be an array');
    }

    middleware.forEach(function(fn) {
        if (typeof fn !== 'function') {
            throw new TypeError('middleware must be a function');
        }
    });

    return function * (initialData, next) {

        let prevMwIndex = -1;

        return yield* dispatch(initialData, 0);

        function * dispatch (data, mwIndex) {
            if (mwIndex <= prevMwIndex) {
                throw new Error('next() called multiple times');
            }

            prevMwIndex = mwIndex;
            const fn = mwIndex < middleware.length
                ? middleware[mwIndex]
                : next;

            if (!fn) { return data; }

            const nxt = function * (data) {
                return yield* dispatch(data, mwIndex + 1);
            };

            // testing aid. eg, expect(value.CALL.fn.wrapee).to.eql(expectedMiddleware);
            nxt.wrapee = middleware[mwIndex + 1] || next;

            return yield* fn(data, nxt);
        }
    };
};
