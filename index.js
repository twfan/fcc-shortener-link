require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const app = express();
let bodyParser = require('body-parser');
const URL = require('url').URL;


// setup mongoose
const mongoose = require('mongoose');
const { count } = require('console');
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true})

const Schema = mongoose.Schema;

const shortenerSchema = new Schema({
  url: {type: String, required: true},
  shortString: {type: String},
});

const Link = mongoose.model("Link", shortenerSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});


app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const createAndSaveLink = async (data) => {
  try {
    let {url, count} = data;
    let doc = await Link.findOne({url:url})

    if (!doc) {
      const linkDocument = new Link({
        url: url,
        shortString: count + 1
      });

      let createdLink = await linkDocument.save();
      return {
        "original_url" : createdLink.url,
        "short_url": createdLink.shortString
      };
    } else {
      return {
        "original_url": doc.url,
        "short_url": doc.shortString
      }
    }
  } catch (err) {
    console.error("Error in createAndSaveLink: ", err);
    throw err;
  }
}

const findByShort = async (data) => {
  try {
    let urlFound = await Link.findOne({shortString:data})
    if (!urlFound) {
      return false;
    }

    return urlFound;

  } catch (err) {
    console.error("Error in findByUrl:", err);
    throw err;
  }
}

function isValidURL(str) {
  try {
      new URL(str);
      return true;
  } catch (error) {
      return false;
  }
}


app.get("/api/shorturl/:shortstring", async (req, res) => {
  try {
    let {shortstring} = req.params
    let checkShort = await findByShort(shortstring)

    if (checkShort) {
      res.writeHead(302, {'Location': checkShort.url});
      res.end();
    } else {
      return res.json('Not Found');
    }
  } catch (err) {
    console.error("Error in GET /app/shorturl :", err)
    return res.json({
      "error": "An Error Occured"
    });
  }
})

app.post("/api/shorturl", async (req, res)=>{
  try {
    let {url} = req.body
    
    if (!isValidURL(url)) {
      return res.json({
        "error": "Invalid URL"
      })
    }

    const urlObject = new URL(url)
    await dns.lookup(urlObject.hostname, (err, data) => {
      if (err) {
        return res.json({
          "error": "Invalid URL"
        })
      }
    })

    let countDocuments = await Link.countDocuments({});

    let dataObj = {
      "url": url,
      "count": countDocuments
    }

    let document = await createAndSaveLink(dataObj)
    return res.json({
      "original_url": document.original_url,
      "short_url" : document.short_url
    })

  } catch (err) {
    console.error("Error in /api/shorturl:", err)
    return res.json({
      "error": "An error occurred"
    })
  }
});