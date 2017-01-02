
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

  let finished = false;

  getWeather(city, (err, res) => {
    finished = true;
    if (err){
      executeObservers(err);
      return;
    }
    executeObservers(null, res);
  });

  function executeObservers(err, res){
    if (finished === true){
      if (err){
        operations.fail();
      } else {
        operations.succeed();
      }
    }
  }

  return operations;
}

function fetchCurrentCity(){
  const operations = new Operation();
  let finished = false;

  getCurrentCity((err, res) => {
    finished = true;
    if (err){
      executeObservers(err);
      return;
    }
    executeObservers(null, res);
  });

  function executeObservers(err, res){
    if (finished === true){
      if (err){
        operations.fail();
      } else {
        operations.succeed();
      }
    }
  }

  return operations;
}


function Operation(){
  const operation = {
    _successReactions: [],
    _errorReactions: [],
  };

  operation.onCompletion = function onCompletion(success, error){
    operation._successReactions.push(success);
    operation._errorReactions.push(error);
  };
  operation.onFailure = function onFailure(error){
    operation.onCompletion(null, error);
  };
  operation.fail = function fail(err){
    operation._errorReactions.forEach((fn) => {
      if (fn){
        fn(err);
      }
    });
    operation.clear();
  };
  operation.succeed = function succeed(result){
    operation._successReactions.forEach((fn) => {
      if (fn){
        fn(result);
      }
    });
    operation.clear();
  };
  operation.clear = function clear(){
    operation._successReactions = [];
    operation._errorReactions = [];
  }

  return operation;
}


suite('operations');

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

test("test fetchForecast with operations type.", done => {
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
