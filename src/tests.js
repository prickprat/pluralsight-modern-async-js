const delayms = 1;
const expectedCurrentCity = 'New York, NY';
const expectedForecast = {
    fiveDay: [60, 70, 80, 45, 50]
};

function getCurrentCity(callback) {
    setTimeout(function () {

        const city = 'New York, NY';
        callback(null, city);

    }, delayms);
}

function getWeather(city, callback) {
    setTimeout(function () {

        if (!city) {
            callback(new Error('City required to get weather'));
            return;
        }

        const weather = {
            temp: 50
        };

        callback(null, weather);

    }, delayms);
}

function getForecast(city, callback) {
    setTimeout(function () {

        if (!city) {
            callback(new Error('City required to get forecast'));
            return;
        }

        callback(null, expectedForecast);

    }, delayms);
}

let fetchForecast = Operation.promisify(getForecast);
let fetchWeather = Operation.promisify(getWeather);
let fetchCurrentCity = Operation.promisify(getCurrentCity);

const cityFailError = new Error('Gps Broken.');
function fetchCurrentCityThatFails(){
    let op = new Operation();

    waitAsync(() => {
        op.reject(cityFailError);
    });

    return op;
}
function fetchCurrentCityIndecisive(){
    const op = new Operation();
    waitAsync(() => {
        op.resolve('nyc');
        op.resolve('philly');
    });
    return op;
}
function fetchCurrentCityRepeatFail(){
    const op = new Operation();
    waitAsync(() => {
        op.reject(new Error('first fail'));
        op.reject(new Error('second fail'));
    });
    return op;
}


suite('operations');

test('sync result transformation', () => {
    return fetchCurrentCity()
        .then(() => {
            return '10019';
        })
        .then((zip) => {
            expect(zip).toBe('10019');
        });
});

test('what is resolve?', done => {
    const fc = new Operation();
    fc.resolve('nyc');

    fclone = new Operation();
    fclone.resolve(fc);

    fclone.then((city) => {
        expect(city).toBe('nyc');
        done();
    });
});

test('ensure async success handler evaluation', done => {
    Operation.resolve('nyc')
        .then((city) => {
            expect(city).toBe('nyc');
            doneAlias();
        });

    const doneAlias = done;
});

test('ensure async error handler evaluation', done => {
    Operation.reject(new Error('error: sync fail'))
        .catch((err) => {
            expect(err.message).toBe('error: sync fail');
            doneAlias();
        });

    const doneAlias = done;
});

test('protect from mutiple fail calls', done => {
    fetchCurrentCityRepeatFail()
    .catch(() => done());
});

test('protect from mutiple success calls', () => {
    return fetchCurrentCityIndecisive();
});

test('thrown error recovery in catch', done => {
    fetchCurrentCity()
    .then((city) => {
        throw new Error ('then throwes');
        return fetchWeather(city);
    })
    .catch((err) => {
        expect(err.message).toBe('then throwes');
        throw new Error('catch throwes');
    })
    .catch((err2) => {
        expect(err2.message).toBe('catch throwes');
        done();
    });
});

test('reusing error handlers - anywhere', done => {
    fetchCurrentCity()
    .then(() => fetchForecast())
    .catch(() => done());
});

test('thrown error recovery', done => {
    fetchCurrentCity()
    .then((city) => {
        throw new Error('oops');
        return fetchWeather(city);
    })
    .catch(e => done());
});

test('sync result fall through', done => {
    fetchCurrentCity()
    .then((city) => {
        return '10019';
    })
    .then((zip) => {
        expect(zip).toBe('10019');
        done();
    });
});

test('error fallthrough', done => {
    fetchCurrentCityThatFails()
    .then((city) => console.log(city))
    .then((city) => fetchForecast(city))
    .catch(err => {
        expect(err).toBe(cityFailError);
        done();
    });
});

test('error recovery async', done => {
    fetchCurrentCityThatFails()
    .catch(() => {
        return fetchCurrentCity();
        console.log('here!!');
    })
    .then((city) => {
        expect(city).toBe(expectedCurrentCity);
        done();
    });
});

test('error recover', done => {
    fetchCurrentCityThatFails()
    .catch((err) => {
        console.error(err);
        return 'default city';
    })
    .then((city) => {
        expect(city).toBe('default city');
        done();
    });
});

test('error handler bypass when no error', done => {
    fetchCurrentCity()
    .catch(err => 'default city')
    .then(city => {
        expect(city).toBe(expectedCurrentCity);
        done();
    });
});

test('avoiding nested async', done => {
    let weatherOp = fetchCurrentCity()
    .then(fetchWeather)
    .then(checkWeather);

    function checkWeather(weather){
        if (weather){
            done();
        }
    }
});

test('lexical parallelism', done => {
    let city = 'Sydney';
    let weather = fetchWeather(city);
    let forecast = fetchForecast(city);

    weather.onCompletion((currWeather) => {
        forecast.onCompletion((currForecast) => {
            console.log(currWeather);
            console.log(currForecast);
            done();
        });
    });
});

test('register error async', done => {
    let currentCity = fetchWeather();

    waitAsync(() => {
        currentCity.onFailure(() => {
            done();
        });
    });
});

test('register success async', done => {
    let currentCity = fetchCurrentCity();

    waitAsync(() => {
        currentCity.onCompletion((city) => {
            done();
        });
    });
});

test('pass multiple callbacks - all of them called.', done => {
    const op = fetchCurrentCity();
    const multiDone = callDone(done).afterNCalls(2);

    op.onCompletion(res => multiDone());
    op.onCompletion(res => multiDone());
});

test('register only error Handler, ignore success.', done => {
    const op = fetchWeather();

    op.onCompletion(() => done(new Error('should not succeed.')));
    op.onFailure(() => done());
});

test('fetchForecast with operations type.', done => {
    const op = fetchForecast('cityname');
    const multiDone = callDone(done).afterNCalls(2);

    op.onCompletion(() => multiDone());
    op.onCompletion(() => multiDone());
});

test('fetchCurrentCity pass the callbacks later on', done => {
    fetchCurrentCity()
    .onCompletion((city) => {
        console.log(`onSuccess :: ${city}.`);
        done();
    },
    (err) => {
        console.error(`onError :: ${err}.`);
        done(err);
    });
});