let Discogs = require('disconnect').Client;
const USER = require('./pat.js');
const FOLDERS = require('./folder');
const _dis = new Discogs(USER.userAgent, { userToken: USER.userToken }); // Authenticate by user token
const user_collection = _dis.user().collection();

const categorizeReleases = (releases, foldermap) => {
    releases.forEach(release => {
        const folder = FOLDERS.discoverFolder(release, foldermap);
        // short circuit if folder categories match
        if (folder.id === release.folder_id) {
            console.warn(`${release.basic_information.title} is in the correct category.`)
            return;
        }

        moveReleaseInstanceToFolder(release, folder).then(data => {
            console.log(`${release.basic_information.title} from ${release.basic_information.year} was re-categorized to ${folder.name}`)
        }).catch(error => {
            console.error(error, ` While trying to recategorize ${release.basic_information.title} from ${release.basic_information.year} to ${folder.name}`);
        })
    });
}

const createUserFolder = (name) => {
    return _dis._request({
        url: `/users/${USER.name}/collection/folders`, method: 'POST', data: { name }
    });
}

const moveReleaseInstanceToFolder = (release, newFolder) => {
    return _dis._request({
        url: `/users/${USER.name}/collection/folders/${release.folder_id}/releases/${release.id}/instances/${release.instance_id}`, method: 'POST', data: { folder_id: newFolder.id }
    });
}

const getUserFolders = () => { 
    return _dis._request({
        url: `/users/${USER.name}/collection/folders`, method: 'GET', data: {}
    });
}

const getPagePromise = (options) => {
    return user_collection.getReleases(USER.name, 0, options);
}

module.exports = {
    categorizeReleases,
    createUserFolder,
    moveReleaseInstanceToFolder,
    getUserFolders,
    getPagePromise
}