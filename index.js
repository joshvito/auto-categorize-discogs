let Discogs = require('disconnect').Client;
const USER = require('./pat.js');
// Authenticate by user token
const _dis = new Discogs({ userToken: USER.token });
const collection = _dis.user().collection();

/**
 * returns obj with user folders e.g.
    {
        "folders": [
            {
            "id": 0,
            "count": 23,
            "name": "All",
            "resource_url": "https://api.discogs.com/users/example/collection/folders/0"
            },
            {
            "id": 1,
            "count": 20,
            "name": "Uncategorized",
            "resource_url": "https://api.discogs.com/users/example/collection/folders/1"
            }
        ]
    }
 */
let user_folders  = _dis._request({
        url: `/users/${USER.name}/collection/folders`, method: 'GET', data: {}
    });
let page = collection.getReleases(USER.name, 0, { page: 1, per_page: 1 });

let _FP = Promise.all([user_folders, page]);
_FP.then((data) => {
    let [folders, page] = data;
    let user_folders_map = _foldersToMap(folders.folders)
    let release = page.releases[0];
    let folder = _discoverFolder(release, user_folders_map);
    if (!folder.id) {
        let newfolder = createUserFolder(folder.name)
            .then(folder => {
                user_folders_map = _foldersToMap([folder], _foldersToMap);
                moveReleaseInstanceToFolder(release, folder);
            })
    }
})
.catch(error => console.error(error));

const createUserFolder = (name) => {
    return _dis._request({
        url: `/users/${USER.name}/collection/folders`, method: 'POST', data: { name }
    });
}

const moveReleaseInstanceToFolder = (release, newFolder) => {
    debugger;
    return _dis._request({
        url: `/users/${USER.name}/collection/folders/${release.folder_id}/releases/${release.id}/instances/${release.instance_id}`, method: 'POST', data: { folder_id: newFolder.id}
    }).then(response => console.log(response))
    .catch(error =>  {
        debugger 
        console.error(error)
    });
}


 /**
 * {pagination: Object, releases: Array(n)}
 *        pagination:Object {per_page: 1, items: 167, page: 1, …}
 *        releases: [
 * {
      "id": 2464521,
      "instance_id": 1,
      "folder_id": 1,
      "rating": 0,
      "basic_information": {
        "id": 2464521,
        "title": "Information Chase",
        "year": 2006,
        "resource_url": "https://api.discogs.com/releases/2464521",
        "thumb": "https://api-img.discogs.com/vzpYq4_kc52GZFs14c0SCJ0ZE84=/fit-in/150x150/filters:strip_icc():format(jpeg):mode_rgb()/discogs-images/R-2464521-1285519861.jpeg.jpg",
        "cover_image": "https://api-img.discogs.com/vzpYq4_kc52GZFs14c0SCJ0ZE84/fit-in/500x500/filters:strip_icc():format(jpeg):mode_rgb():quality(90)/discogs-images/R-2464521-1285519861.jpeg.jpg",
        "formats": [
          {
            "qty": "1",
            "descriptions": [ "Mini", "EP" ],
            "name": "CDr"
          }
        ],
        "labels": [
          {
            "resource_url": "https://api.discogs.com/labels/11647",
            "entity_type": "",
            "catno": "8BP059",
            "id": 11647,
            "name": "8bitpeoples"
          }
        ],
        "artists": [
          {
            "id": 103906,
            "name": "Bit Shifter",
            "join": "",
            "resource_url": "https://api.discogs.com/artists/103906",
            "anv": "",
            "tracks": "",
            "role": ""
          }
        ]
      },
      "notes": [
        {
          "field_id": 3,
          "value": "bleep bloop blorp."
        }
 */
const _discoverFolder = (_release, _foldersmap, forceRecategorization = false) => {
    const year = _release.basic_information.year;
    const name = _convertYearToFolderName(year);
    // determine folder name
    // check if it already exists
    // return existing or new folder if force or uncategorized
    if (forceRecategorization || _release.folder_id === 1) {
        if (_foldersmap && _foldersmap.hasOwnProperty(name)) {
            return _foldersmap[name]
        } else {  
            return {
                    id: null,
                    name
                }
        }
    }
}

const _convertYearToFolderName = (year) => {
    if (typeof year !== 'number') {
        year = parseInt(year, 10)
    }
    let decade = Math.floor(year / 10) * 10;
    return decade.toString() + "'s";
}

const _foldersToMap = (folders, prevMap = null) => {
    let newMap = folders.reduce((accum, folder) => {
        accum[folder.id.toString()] = folder;
        accum[folder.name] = folder;
        return accum;
    }, {});
    return prevMap ? Object.assign(prevMap, newMap) : newMap;
};