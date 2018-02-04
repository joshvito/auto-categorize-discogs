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
            ...
        ]
    }
 */
let user_folders  = _dis._request({
        url: `/users/${USER.name}/collection/folders`, method: 'GET', data: {}
    });
let page = collection.getReleases(USER.name, 0, { page: 1, per_page: 5 });

let _FP = Promise.all([user_folders, page]);
_FP.then((data) => {
    let [folders, page] = data;
    let user_folders_map = _foldersToMap(folders.folders)

    let requiredFolders = page.releases.map(release => {
        return _discoverFolder(release, user_folders_map);
    })

    const foldersToCreate = requiredFolders
        .filter(folder => !folder.id) // we only want to create folders that don't exist
        .filter((value, index, self) => {
            // make sure we get unique folder names
            return self.findIndex(o => o.name === value.name) === index;
        });
    
    const folderPromises = foldersToCreate.map(f => createUserFolder(f.name));
    const createdFolders = Promise.all(folderPromises);
    createdFolders
        .then(data => {
            debugger;
            return user_folders_map = _foldersToMap(data, user_folders_map);
        })
        .catch(error => {
            debugger;
        })
    // let newFolder = categorizeRelease(release, folder); 
})
.catch(error => console.error(error));

const categorizeRelease = (release, folder) => {
    if (folder && !folder.id) {
        createUserFolder(folder.name)
            .then(data => {
                moveReleaseInstanceToFolder(release, data);
                return data;
            })
    } else {
        moveReleaseInstanceToFolder(release, folder);
        return folder
    }
}

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
        console.error(error)
    });
}

/**
 * 
 * @param {*} _release 
 * @param {*} _foldersmap 
 * @param {*} forceRecategorization boolean, optional, default = false
 * // determine folder name
    // if force or uncategorized
    // check if it already exists
    // return existing or new folder
 */
const _discoverFolder = (_release, _foldersmap, forceRecategorization = false) => {
    const year = _release.basic_information.year;
    const name = _convertYearToFolderName(year);
    
    if (forceRecategorization || _release.folder_id === 1) {
        if (_foldersmap && _foldersmap.hasOwnProperty(name)) {
            return _foldersmap[name]
        } else {  
            return {
                    id: null,
                    name
                }
        }
    } else {
        return _foldersmap[name]
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