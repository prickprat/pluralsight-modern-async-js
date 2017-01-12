const delayms = 1;
const expectedCurrentCity = "New York, NY";
const expectedForecast = {
  fiveDay: [60, 70, 80, 45, 50]
};

function getCurrentCity(callback) {
  setTimeout(function () {

    const city = "New York, NY";
    callback(null, city);

  }, delayms)
}

function getWeather(city, callback) {
  setTimeout(function () {

    if (!city) {
      callback(new Error("City required to get weather"));
      return;
    }

    const weather = {
      temp: 50
    };

    callback(null, weather)

  }, delayms)
}

function getForecast(city, callback) {
  setTimeout(function () {

    if (!city) {
      callback(new Error("City required to get forecast"));
      return;
    }

    callback(null, expectedForecast);

  }, delayms)
}

function fetchForecast(city){
  const operations = new Operation();

  getForecast(city, (err, res) => {
    if (err){
      operations.fail(err);
    } else {
      operations.resolve(res);
    }
  });

  return operations;
}

function fetchWeather(city){
  const operations = new Operation();

  getWeather(city, (err, res) => {
    if (err){
      operations.fail(err);
      return;
    }
    operations.resolve(res);
  });

  return operations;
}

function fetchCurrentCity(){
  const operations = new Operation();

  getCurrentCity((err, res) => {
    console.log(res);
    if (err){
      operations.fail(err);
      return;
    }
    operations.resolve(res);
  });

  return operations;
}

const cityFailError = new Error('Gps Broken.');
function fetchCurrentCityThatFails(){
  let op = new Operation();

  waitAsync(() => {
    op.fail(cityFailError);
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
    op.fail(new Error('first fail'));
    op.fail(new Error('second fail'));
  });
  return op;
}

function Operation(){
  const operation = {
    _successReactions: [],
    _errorReactions: [],
    _state: 'pending',
    _result: null,
    _isComplete: () => {
      return operation._state === 'success' ||
              operation._state === 'fail';
    },
    then: onCompletion,
    catch: onFailure,
    resolve: resolve,
    reject: fail,
    onCompletion,
    onFailure,
    fail,
    _succeed,
    clear,
  };


  return operation;

  ////Class functions//////
  function onCompletion(successFn, errorFn){
    const proxyOp = new Operation();

    if (operation._state === 'fail'){
      return errorHandler();
    }
    if (operation._state === 'success'){
      return successHandler();
    }

    operation._successReactions.push(successHandler);
    operation._errorReactions.push(errorHandler);

    return proxyOp;

    /// Private Functions ////
    function successHandler(){
      return waitAsync(() => {
        let callbackRes;
        if (successFn) {
          try{
            callbackRes = successFn(operation._result);
          } catch (successFnErr){
            return proxyOp.fail(successFnErr);
          }
          return proxyOp.resolve(callbackRes);
        }
        return proxyOp.resolve(operation._result);
      });
    }

    function errorHandler(){
      return waitAsync(() => {
        let callbackRes;
        if (errorFn){
          try {
            callbackRes = errorFn(operation._result);
          } catch (errorFnErr){
            return proxyOp.fail(errorFnErr);
          }
          return proxyOp.resolve(callbackRes);
        }
        return proxyOp.fail(operation._result);
      });
    }
  };

  function resolve(value){
    if (operation._isComplete()){
      return;
    }

    if (value && value.then){
      return value.then(operation.resolve, operation.fail);
    }
    return operation._succeed(value);
  };

  function onFailure(error){
    return operation.onCompletion(null, error);
  };

  function fail(err){
    if (operation._isComplete()){
      return;
    }
    operation._state = 'fail';
    operation._result = err;

    operation._errorReactions
      .forEach((fn) => {
        fn(err);
      });
    operation.clear();
  };

  function _succeed(result){
    operation._state = 'success';
    operation._result = result;
    operation._successReactions
      .forEach((fn) => {
        fn(result);
      });
    operation.clear();
  };

  function clear(){
    operation._successReactions = [];
    operation._errorReactions = [];
  };
}

suite('operations');

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
  const op = new Operation();
  op.resolve('nyc');
  op.then((city) => {
    expect(city).toBe('nyc');
    doneAlias();
  });

  const doneAlias = done;
});

test('ensure async error handler evaluation', done => {
  const op = new Operation();
  op.fail(new Error('error: sync fail'));
  op.catch((err) => {
    expect(err.message).toBe('error: sync fail');
    doneAlias();
  });

  const doneAlias = done;
});

test('protect from mutiple fail calls', done => {
  fetchCurrentCityRepeatFail()
    .catch(e => done());
});

test('protect from mutiple success calls', done => {
  fetchCurrentCityIndecisive()
    .then(c => done());
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
})

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

test("error recovery async", done => {
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
    .catch(err => "default city")
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
  })
});

test('register error async', done => {
  let currentCity = fetchWeather();

  waitAsync(() => {
    currentCity.onFailure((err) => {
      done();
    })
  });
});

test('register success async', done => {
  let currentCity = fetchCurrentCity();

  waitAsync(() => {
    currentCity.onCompletion((city) => {
      done();
    })
  });
});

test("pass multiple callbacks - all of them called.", done => {
  const op = fetchCurrentCity();
  const multiDone = callDone(done).afterNCalls(2);

  op.onCompletion(res => multiDone());
  op.onCompletion(res => multiDone());
});

test("register only error Handler, ignore success.", done => {
  const op = fetchWeather();

  op.onCompletion(res => done(new Error('should not succeed.')));
  op.onFailure(res => done());
});

test("fetchForecast with operations type.", done => {
  const op = fetchForecast('cityname');
  const multiDone = callDone(done).afterNCalls(2);

  op.onCompletion(res => multiDone());
  op.onCompletion(res => multiDone());
})

test("fetchCurrentCity pass the callbacks later on", done => {
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
