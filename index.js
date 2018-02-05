const FOLDERS = require('./src/folder');
const API = require('./src/api');
const PAGE_OPTIONS = { page: 1, per_page: 10 };

let categorizeByDecade = (user_folders_promise, page_promise) => {
    
    let _FP = Promise.all([user_folders_promise, page_promise]);
    _FP.then((data) => {
        let [folders, page] = data;
        let user_folders_map = FOLDERS.foldersToMap(folders.folders)
    
        let requiredFolders = page.releases.map(release => {
            return FOLDERS.discoverFolder(release, user_folders_map);
        })
    
        const foldersToCreate = FOLDERS.filterOutDupes(requiredFolders);
        const folderPromises = foldersToCreate.map(f => API.createUserFolder(f.name));
        
        if (folderPromises.length === 0 ) {
            setTimeout(() => {
                API.categorizeReleases(page.releases, user_folders_map);
            }, 0)
            return;
        }
        
        user_folders_map = Promise.all(folderPromises).then(data => {
            const updated_folders_map = FOLDERS.foldersToMap(data, user_folders_map); 
            setTimeout(() => {
                API.categorizeReleases(page.releases, updated_folders_map);
            }, 0)
            return updated_folders_map;
        })
        .catch(error => {
            console.error(error);
            return user_folders_map;
        })
    })
    .catch(error => console.error(error));
}

categorizeByDecade(API.getUserFolders(), API.getPagePromise(PAGE_OPTIONS));