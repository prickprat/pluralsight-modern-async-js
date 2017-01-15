///////////////////////
function* weatherFinder(){
    let city = yield fetchCurrentCity();
    let weather = yield fetchWeather(city);
    return weather;
}

function* weatherFinderFail(){
    let city = yield fetchCurrentCity();
    let weather = yield fetchWeather();
    return weather;
}

function awaiter(generator){
    return new Promise((resolve, reject) => {
        remind(() => generator.next(null));

        function remind(resume){
            let nextResult;
            try {
                nextResult = resume();
            } catch (error) {
                return reject(error);
            }

            if (nextResult.done){
                return resolve(nextResult.value);
            }

            Promise.resolve(nextResult.value)
                .then((res) => {
                    return remind(() => generator.next(res));
                })
                .catch((err) => {
                    return remind(() => generator.throw(err));
                });
        }
    });
}
///////////////////////
suite('Async using generators');

test('serialized async operation success', () => {
    return awaiter(weatherFinder())
        .then((res) => {
            expect(res.temp).toBe(50);
        });
});

test('serialized async operation fail', () => {
    return awaiter(weatherFinderFail())
        .catch((e) => {
            expect(e.message).toBe('City required to get weather');
        });
});