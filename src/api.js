let Discogs = require('disconnect').Client;
const USER = require('./pat.js');
const FOLDERS = require('./folder');
const _dis = new Discogs(USER.userAgent, { userToken: USER.userToken }); // Authenticate by user token
const user_collection = _dis.user().collection();
const database = _dis.database();

/**
 * @param {[[any, any]]} releases is an array of tuple [release, master]
 * @param {any} foldermap
 */
const categorizeReleases = (releases, foldermap) => {
  releases.forEach(data => {
    const [release, master] = data;
    const folder = FOLDERS.discoverFolder(data, foldermap);
    // short circuit if folder categories match
    if ((folder && folder.id) === release.folder_id) {
      console.warn(`[SKIPPED] | ${release.basic_information.title} is in the correct folder.`)
      return;
    }

    moveReleaseInstanceToFolder(release, folder)
      .then(data => {
        const _msg =  `[MOVED] | ${release.basic_information.title}(${release.basic_information.year}) was re-categorized to ${folder.name} it's master year is ${master.year}`;
        console.log(_msg);
      }).catch(error => {
        console.error(error, `[ERROR] | While trying to recategorize ${release.basic_information.title} from ${release.basic_information.year} to ${folder.name}`);
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

/**
 * 
 * @param {{
 *           page: number,
 *           per_page: number
 *       }} options
 *  @returns {Promise} a tuple of [release, master]
 */
const getPageOfReleasesPromise = (options) => {
  const releases = user_collection.getReleases(USER.name, 0, options);
  return releases.then(data => {
      const promises = data.releases.map(release => getMasterByReleaseId(release.id))
      return Promise.all(promises).then(masters => {
        return { 
          ...data,
          ...{
            releases: data.releases.map((r, indx) => [r, masters[indx]])
            },
          }
      });
  });
}

/**
 * @param {(number|string)} _releaseId
 * @returns {Promise}
 */
const getMasterByReleaseId = (_releaseId) => {
  return database.getRelease(_releaseId).then((data) => {
    return (data && data.master_id)
      ? database.getMaster(data.master_id)
      : Promise.resolve(data)
  });
};

module.exports = {
  categorizeReleases,
  createUserFolder,
  moveReleaseInstanceToFolder,
  getUserFolders,
  getPageOfReleasesPromise,
  getMasterByReleaseId
}