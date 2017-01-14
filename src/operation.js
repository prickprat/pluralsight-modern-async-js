'use strict';

function Operation(executor) {
    const operation = {
        _successReactions: [],
        _errorReactions: [],
        _state: 'pending',
        _result: null,
        _isResolved: () => {
            return operation._state === 'success' ||
                operation._state === 'reject';
        },
        then: onCompletion,
        catch: onFailure,
        resolve: resolve,
        reject,
        onCompletion,
        onFailure,
        _succeed,
        fail: reject,
        clear,
    };


    if (typeof executor === 'function'){
        //dependency inject resolve and reject
        executor(operation.resolve, operation.reject);
    }

    return operation;

    ////Class functions//////
    function onCompletion(successFn, errorFn) {
        const proxyOp = new Operation();

        if (operation._state === 'reject') {
            return errorHandler();
        }
        if (operation._state === 'success') {
            return successHandler();
        }

        operation._successReactions.push(successHandler);
        operation._errorReactions.push(errorHandler);

        return proxyOp;

        /// Private Functions ////
        function successHandler() {
            return waitAsync(() => {
                let callbackRes;
                if (successFn) {
                    try {
                        callbackRes = successFn(operation._result);
                    } catch (successFnErr) {
                        return proxyOp.fail(successFnErr);
                    }
                    return proxyOp.resolve(callbackRes);
                }
                return proxyOp.resolve(operation._result);
            });
        }

        function errorHandler() {
            return waitAsync(() => {
                let callbackRes;
                if (errorFn) {
                    try {
                        callbackRes = errorFn(operation._result);
                    } catch (errorFnErr) {
                        return proxyOp.fail(errorFnErr);
                    }
                    return proxyOp.resolve(callbackRes);
                }
                return proxyOp.fail(operation._result);
            });
        }
    }

    function resolve(value) {
        if (operation._isResolved()) {
            return;
        }

        if (value && value.then) {
            return value.then(operation._succeed, operation.fail);
        }
        return operation._succeed(value);
    }

    function onFailure(error) {
        return operation.onCompletion(null, error);
    }

    function reject(err) {
        if (operation._isResolved()) {
            return;
        }
        operation._state = 'reject';
        operation._result = err;

        operation._errorReactions
            .forEach((fn) => {
                fn(err);
            });
        // operation.clear();
    }

    function _succeed(result) {
        operation._state = 'success';
        operation._result = result;
        operation._successReactions
            .forEach((fn) => {
                fn(result);
            });
        // operation.clear();
    }

    function clear() {
        operation._successReactions = [];
        operation._errorReactions = [];
    }
}

Operation.resolve = function resolve(value){
    return new Operation((resolve) => {
        resolve(value);
    });
};

Operation.reject = function reject(error){
    return new Operation((resolve, reject) => {
        reject(error);
    });
};

Operation.promisify = function promisify(fnToPromisify){
    //The last function is assumed to be a Node Style Callback
    //i.e. (error, result) => {...}
    return (...argsToWrappedFn) => {
        console.dir(argsToWrappedFn);
        let expectedNumArgs = fnToPromisify.length - 1;
        let argNumDifference = expectedNumArgs - argsToWrappedFn.length;

        if (argNumDifference > 0){
            for (let i = 0; i < argNumDifference; i += 1){
                argsToWrappedFn.push(undefined);
            }
        } else if (argNumDifference){
            argsToWrappedFn = argsToWrappedFn.slice(0, expectedNumArgs);
        }

        console.dir(argsToWrappedFn);
        return new Operation((resolve, reject) => {
            fnToPromisify(...argsToWrappedFn, (err, result) => {
                if (err){
                    return reject(err);
                }
                return resolve(result);
            });
        });
    };
};