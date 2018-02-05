let Discogs = require('disconnect').Client;
const USER = require('./pat.js');
const FOLDERS = require('./src/folder');

const _dis = new Discogs({ userToken: USER.token }); // Authenticate by user token
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
let page = collection.getReleases(USER.name, 0, { page: 1, per_page: 10 });

let _FP = Promise.all([user_folders, page]);
_FP.then((data) => {
    let [folders, page] = data;
    let user_folders_map = FOLDERS.foldersToMap(folders.folders)

    let requiredFolders = page.releases.map(release => {
        return FOLDERS.discoverFolder(release, user_folders_map);
    })

    const foldersToCreate = FOLDERS.filterOutDupes(requiredFolders);
    const folderPromises = foldersToCreate.map(f => createUserFolder(f.name));
    
    if (folderPromises.length === 0 ) {
        setTimeout(() => {
            categorizeReleases(page.releases, user_folders_map);
        }, 0)
        return;
    }
    
    user_folders_map = Promise.all(folderPromises).then(data => {
        const updated_folders_map = FOLDERS.foldersToMap(data, user_folders_map); 
        setTimeout(() => {
            categorizeReleases(page.releases, updated_folders_map);
        }, 0)
        return updated_folders_map;
    })
    .catch(error => {
        console.error(error);
        return user_folders_map;
    })
})
.catch(error => console.error(error));

const categorizeReleases = (releases, foldermap) => {
    let releasePromises = releases.map(release => {
        const folder = FOLDERS.discoverFolder(release, foldermap);
        return folder ? moveReleaseInstanceToFolder(release, folder) : Promise.resolve();
    });
    Promise.all(releasePromises).then(data => {
        debugger;
    }).catch(error => {
        debugger;
        console.warn(error);
    })
}

const createUserFolder = (name) => {
    return _dis._request({
        url: `/users/${USER.name}/collection/folders`, method: 'POST', data: { name }
    });
}

const moveReleaseInstanceToFolder = (release, newFolder) => {
    return _dis._request({
        url: `/users/${USER.name}/collection/folders/${release.folder_id}/releases/${release.id}/instances/${release.instance_id}`, method: 'POST', data: { folder_id: newFolder.id}
    });
}
