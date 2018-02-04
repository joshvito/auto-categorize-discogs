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
let page = collection.getReleases(USER.name, 0, { page: 1, per_page: 5 });

let _FP = Promise.all([user_folders, page]);
_FP.then((data) => {
    let [folders, page] = data;
    let user_folders_map = FOLDERS.foldersToMap(folders.folders)

    let requiredFolders = page.releases.map(release => {
        return FOLDERS.discoverFolder(release, user_folders_map);
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
            return user_folders_map = FOLDERS.foldersToMap(data, user_folders_map);
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
    return _dis._request({
        url: `/users/${USER.name}/collection/folders/${release.folder_id}/releases/${release.id}/instances/${release.instance_id}`, method: 'POST', data: { folder_id: newFolder.id}
    }).then(response => console.log(response))
    .catch(error =>  {
        console.error(error)
    });
}
