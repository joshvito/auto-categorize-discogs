const FOLDERS = require('./src/folder');
const API = require('./src/api');
const PAGE_OPTIONS = { page: 1, per_page: 10 };

const checkForMorePages = (meta, pageOptions) => {
    if (!meta) return pageOptions;
    if (meta.pages > meta.page) {
        return {
            page: meta.page + 1,
            per_page: meta.per_page
        }
    }
    return false;
}

const callApiWithDelay = (cb) => {
    // this is because the API only allows 60 requests per minute
    // roughly ~2 sec per possible recategorization this includes overhead for requests for collection, folders,  and folder creation
    setTimeout(() => {
        cb()
    }, PAGE_OPTIONS.per_page * 9000) 
}

let categorizeByDecade = (user_folders_promise, page_promise, pageOptions) => {
    
    let _FP = Promise.all([user_folders_promise, page_promise]);
    _FP.then((data) => {
        let [folders, page] = data;
        let _meta = page.pagination;
        let _nextPageOptions = checkForMorePages(_meta, pageOptions);
        let user_folders_map = FOLDERS.foldersToMap(folders.folders)
        
        let /**
           * @param {[any, any]} release , tuple of [release, master]
           */
        requiredFolders = page.releases.map(data => {
            return FOLDERS.discoverFolder(data, user_folders_map);
        })
    
        const foldersToCreate = FOLDERS.filterOutDupes(requiredFolders);
        const folderPromises = foldersToCreate.map(f => API.createUserFolder(f.name));
                
        if (folderPromises.length === 0 ) {
            setTimeout(() => {
                API.categorizeReleases(page.releases, user_folders_map);
                if (_nextPageOptions) callApiWithDelay(() => categorizeByDecade(API.getUserFolders(), API.getPageOfReleasesPromise(_nextPageOptions), _nextPageOptions));
            }, 0)
            return;
        }
        
        user_folders_map = Promise.all(folderPromises).then(data => {
            const updated_folders_map = FOLDERS.foldersToMap(data, user_folders_map); 
            setTimeout(() => {
                API.categorizeReleases(page.releases, updated_folders_map);
                if (_nextPageOptions) callApiWithDelay(() => categorizeByDecade(API.getUserFolders(), API.getPageOfReleasesPromise(_nextPageOptions), _nextPageOptions));
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

categorizeByDecade(API.getUserFolders(), API.getPageOfReleasesPromise(PAGE_OPTIONS), PAGE_OPTIONS);