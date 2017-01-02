
const delayms = 1;

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

    const fiveDay = {
      fiveDay: [60, 70, 80, 45, 50]
    };

    callback(null, fiveDay)

  }, delayms)
}

function fetchForecast(city){
  const operations = new Operation();

  getForecast(city, (err, res) => {
    if (err){
      operations.fail(err);
    } else {
      operations.succeed(res);
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
    operations.succeed(res);
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
    operations.succeed(res);
  });

  return operations;
}


function Operation(){
  const operation = {
    _successReactions: [],
    _errorReactions: [],
    _state: 'pending',
    _result: null,
  };

  operation.onCompletion = function onCompletion(successFn, errorFn){
    const completionOp = new Operation();
    
    if (operation._state === 'fail'){
      return errorHandler();
    }
    if (operation._state === 'success'){
      return successHandler();
    }

    operation._successReactions.push(successHandler);
    operation._errorReactions.push(errorHandler);

    return completionOp;

    /// Private Functions ////
    function successHandler(){
      if (successFn) {
        let callbackRes = successFn(operation._result);
        if (callbackRes && callbackRes.onCompletion){
          return callbackRes.forwardCompletion(completionOp);
        }
      }
    }

    function errorHandler(){
      if (errorFn){
        errorFn(operation._result);
      }
    }
  };
  operation.then = operation.onCompletion;

  operation.onFailure = function onFailure(error){
    return operation.onCompletion(null, error);
  };

  operation.fail = function fail(err){
    operation._state = 'fail';
    operation._result = err;

    operation._errorReactions.forEach((fn) => {
        fn(err);
    });
    operation.clear();
  };

  operation.succeed = function succeed(result){
    operation._state = 'success';
    operation._result = result;
    operation._successReactions.forEach((fn) => {
      fn(result);
    });
    operation.clear();
  };

  operation.clear = function clear(){
    operation._successReactions = [];
    operation._errorReactions = [];
  };
  
  operation.forwardCompletion = function forwardCompletion(op){
    operation.onCompletion(op.succeed, op.fail);
  };

  return operation;
}


suite('operations');

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
