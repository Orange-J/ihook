const path = require('path');
const execa = require('execa');

const {
    getGitStatus,
    getFilePathList,
    transPathWinToUnix,
    log
} = require('../../../../common/utils');
const { BATCH_CMD_PARAM_TOKEN } = require('../../../../common/const')();
const getPathFilter = require('./getPathFilter');

/**
 * Batch task executor
 * @param {Object} task shaped like
 *  {
 *      type: 'batch',
 *      command: 'eslint <paths>',
 *      filter: () => true,
 *      cwd: '/path/to/cwd'
 *  }
 * @return {Number} exit code, if no error occurs, it's 0, else it's non-zero.
 */
module.exports = (task) => {
    const pkgJsonDir = task.cwd;

    let command = task.command;

    // Get file path list from output of "git status --porcelain"
    let pathList = getFilePathList(getGitStatus());
    if (!pathList.length) {
        log('There is no file to be commited, skip hook.');
        return 0;
    }

    // Transform all paths to Unix format.
    // For example: 'C:\\a\\b' -> '/C/a/b'.
    pathList = pathList.map(transPathWinToUnix);

    // transform absolute paths to relative paths(relative to packageJsonDir).
    pathList = pathList.map(
        item => path.relative(transPathWinToUnix(pkgJsonDir), item)
    );

    if (task.filter) {
        const filter = getPathFilter(task.filter, pkgJsonDir);
        if (!filter) {
            log(`Error occured when resolving the filter config of batch task, please check it.`);
            return 1;
        }
        pathList = pathList.filter(filter);
    }

    if (!pathList.length) {
        log('There is no file path after filtering, skip hook.');
        return 0;
    }

    // Get command and replace param.
    command = command.replace(BATCH_CMD_PARAM_TOKEN, pathList.join(' '));

    let exitCode = 0;

    try {
        log(`run "${command}"`);

        execa.shellSync(command, {
            cwd: task.cwd,
            stdio: 'inherit'
        });
        exitCode = 0;
    } catch (e) {
        exitCode = e.code || 1;
    }

    return exitCode;
};
