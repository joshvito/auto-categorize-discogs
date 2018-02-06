# auto-categorize-discogs

(Work in Progress)
A node app that will auto categorize your discogs collection for you. Currently, this just categorizes by decade.

if you want to use this, you need to include your own `/src/pat.js` file that includes your connection information to the [Discogs Api](https://www.discogs.com/developers/#page:home,header:home-quickstart). Specifically, the file should just be a simple object in the form

```
// pat.js
module.exports = {
    name: 'yourusername',
    token: 'token_string'
}
```

See the Discogs API docs on how to generate a `userToken`. [here](https://www.discogs.com/settings/developers)

TODOs

1. Troubleshoot why last page was not categorized
2. Make this callable from console/cmd
3. figure out how to re-categorize re-releases into the master release year (e.g. the year the album was recorded)
4. add better throttling calculation by counting requests and use a timer
5. categorize uncategorizable releases into an "Error" or "Special" folder