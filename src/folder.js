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
    if (!year || !name) { console.warn(JSON.stringify(_release, null, 1)) }

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

const _filterOutDupes = (folders) => {
    return folders
        .filter(folder => !folder.id) // we only want to create folders that don't exist
        .filter((value, index, self) => {
            // make sure we get unique folder names
            return self.findIndex(o => o.name === value.name) === index;
        });
}

module.exports = {
    discoverFolder: _discoverFolder,
    filterOutDupes: _filterOutDupes,
    foldersToMap: _foldersToMap
}