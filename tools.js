function callDone(doneFn){
    return {
        afterNCalls,
    };

    function afterNCalls(n){
        let callCounter = 0;
        return () => {
            callCounter += 1;
            if (callCounter >= n){
                doneFn();
            }
        };
    }
}

function waitAsync(fn){
    return setTimeout(fn, 1);
}