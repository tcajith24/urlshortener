require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
let bodyParser = require("body-parser");
var mongoose = require('mongoose');
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

/* Database Connection */
const uri = process.env.MONGO_URI
mongoose.connect(uri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
const connection = mongoose.connection;
connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

let urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: Number
})

let Url = mongoose.model('Url', urlSchema)

let responseObject = {}
app.post('/api/shorturl', bodyParser.urlencoded({ extended: false }), (request, response) => {
  let inputUrl = request.body['url']
  let matchUrl1 = inputUrl.replace(/^https?:\/\//, '');
  //let matchUrl=matchUrl1.match(/[^\/]+/);
  let matchUrl = matchUrl1.split('/')[0]
  dns.lookup(matchUrl, (err, addresses, family) => {

    if (err) {
      return response.json({ error: "invalid url" })
    } else {
      responseObject['original_url'] = inputUrl
      let inputShort = 1

      Url.findOne({})
        .sort({ short: 'desc' })
        .exec((error, result) => {
          if (!error && result != undefined) {
            inputShort = result.short + 1
          }
          if (!error) {
            Url.findOneAndUpdate(
              { original: inputUrl },
              { original: inputUrl, short: inputShort },
              { new: true, upsert: true },
              (error, savedUrl) => {
                if (!error) {
                  responseObject['short_url'] = savedUrl.short
                  response.json(responseObject)
                }
              }
            )
          }
        })
    }
  })
})

app.get('/api/shorturl/:input', (request, response) => {
  var urlInput = request.params.input;
  console.log(urlInput);

  Url.findOne({ 'short': urlInput }, (error, result) => {
    if (error) return response.send('Error reading database');

    var re = new RegExp("^(http|https)://", "i");
    var strToCheck = result.original
    if (re.test(strToCheck)) {
      response.redirect(301, result.original);
    } else {
      response.redirect(301, 'http://' + result.original);
    }
  })
})

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
