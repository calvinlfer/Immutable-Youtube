## Immutube

```haskell
search :: [Char] -> Future Maybe [CatVideo]
```

### Prerequisites
- Bower Package Manager: `npm install bower -g`
- Python: [Link](https://www.python.org/downloads/)
- YouTube API Key

### Running
Navigate to the project
```sh
bower install
```

- If you are running Python 2.7: `python -m SimpleHTTPServer`
- If you are running Python 3.5: `python -m http.server`
- Visit [`http://localhost:8000`](http://localhost:8000)

### Demonstration
![streaming](https://cloud.githubusercontent.com/assets/14280155/20418086/6b2b1470-ad18-11e6-8f1b-fe8dbe24e734.gif)

### Notes
You need to get a [Browser API key](https://developers.google.com/youtube/registering_an_application?hl=en) for Youtube from Google API and head on over to app.js located in `scripts` and paste that in the `API_KEY` variable. 
All the code we wrote is in `app.js` and is purely functional with the exception of maybe one or two missing IOs. 

We are essentially writing Haskell in Javascript which is really nice and easy to reason about. Almost everything is a composition. 
