## Immutube

```haskell
search :: [Char] -> Future Maybe [CatVideo]
```

### Running

```sh
bower install
python -m SimpleHTTPServer
```

Then visit `http://localhost:8000`.

### Notes
You need to get a [Browser API key](https://developers.google.com/youtube/registering_an_application?hl=en) for Youtube from Google API and head on over to app.js located in `scripts` and paste that in the `API_KEY` variable. 
All the code we wrote is in `app.js` and is purely functional with the exception of maybe one or two missing IOs. 

We are essentially writing Haskell in Javascript which is really nice and easy to reason about. Almost everything is a composition. 