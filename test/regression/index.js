/**
 * Regression testing in a real scene.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assume = require('assume');

const utils = require('../../common/utils');
const { execSync } = require('child_process');
const {
    BATCH_NAME,
    BATCH_SCRIPT,
    CONFIG_FILE_NAME
} = require('../../common/const')();

const PCE_ROOT_DIR = process.cwd(); // This module's git reposition root dir path.
const TESTING_DIR_NAME = 'sandbox';
const TESTING_DIR_PATH = path.join(PCE_ROOT_DIR, TESTING_DIR_NAME);
const PACKAGE_JSON_PATH = path.join(TESTING_DIR_PATH, 'package.json');

// If there is an exsiting "sandbox" dir, remove it.
if (fs.existsSync(TESTING_DIR_PATH)) {
    try {
        execSync(`rm -rf ./${TESTING_DIR_NAME}`);
    } catch (e) {
        utils.log(`Can't remove the existing "${TESTING_DIR_NAME}" directory, skip testing.`);
        return;
    }
}

// Create "sandbox" directory and some files and directory in sandbox.
try {
    execSync([
        `mkdir ${TESTING_DIR_NAME}`,
        `cd ${TESTING_DIR_NAME}`,
        `mkdir node_modules`,
        `cd node_modules`,
        `mkdir ihook`,
        `cd ..`,
        `echo node_modules > .gitignore`,
        `echo {"pre-commit":["markHookOk"],"scripts":{"markHookOk":"touch hook_run_ok"}} > package.json`,
        `echo init > commited`,
        `git init`,
        `git config user.name "tester"`,
        `git config user.email "test@test.com"`
    ].join(` && `));
} catch (e) {
    utils.log(`Can't create file construct in "sandbox" directory, skip testing.`);
    return;
}

// Copy code file.
try {
    [
        'common',
        'scripts',
        'uninstall.js',
        'package.json'
    ].forEach(name => {
        execSync(`cp -a ./${name} ./${TESTING_DIR_NAME}/node_modules/ihook`);
    });
} catch (e) {
    utils.log(`Error occured when copy code file to sandbox, skip testing.`);
    return;
}

// Install dependence for copied code.
try {
    execSync([
        `cd ${TESTING_DIR_NAME}/node_modules/ihook`,
        `npm install --production`
    ].join(` && `));
} catch (e) {
    utils.log(`Error occured when install dependence for copied code in sandbox, skip testing.`);
    return;
}

// Run install.js.
describe('regression - install.js', function () {
    let ok = true;

    before(function () {
        try {
            execSync([
                `cd ${TESTING_DIR_NAME}`,
                `node ./node_modules/ihook/scripts/install/index.js`
            ].join(` && `));
        } catch (e) {
            ok = false;
        }
    });

    it('run install.js without errors', function () {
        assume(ok).true();
    });

    // TODO: other hooks except "pre-commit"
    it('install "pre-commit" hook file in .git/hooks', function () {
        assume(
            fs.existsSync(`./${TESTING_DIR_NAME}/.git/hooks/pre-commit`)
        ).true();
    });

    it(`copy "${CONFIG_FILE_NAME}" to "package.json"\'s dir`, function () {
        assume(
            fs.existsSync(`./${TESTING_DIR_NAME}/${CONFIG_FILE_NAME}`)
        ).true();
    });
});

// Git commit and trigger hook.
describe('regression - scripts/run/index.js(common hook)', function () {
    let ok = true;
    let commited = 'commited';

    before(function () {
        try {
            execSync([
                `cd ${TESTING_DIR_NAME}`,
                `echo foo >> ${commited}`,
                `git add ${commited}`,
                `git commit -m test`
            ].join(` && `));
        } catch (e) {
            ok = false;
        }
    });

    it('passed pre-commit hook and git commit successly', function () {
        assume(ok).true();
    });

    // it('hook really is triggered and run successly', function () {
    //     assume(
    //         fs.existsSync(`./${TESTING_DIR_NAME}/hook_run_ok`)
    //     ).true();
    // });
});

// Git commit -> trigger hook and fail.
// describe('regression - index.js(common hook fail)', function () {
//     let lastJson;
//     let ok = true;

//     before(function () {
//         utils.modifyPackageJson(
//             PACKAGE_JSON_PATH,
//             json => {
//                 lastJson = JSON.parse(JSON.stringify(json));
//                 json.scripts.markHookFail = 'touch hook_run_fail && exit 1';
//                 json['pre-commit'][0] = 'markHookFail';
//                 return json;
//             }
//         );

//         try {
//             execSync([
//                 `cd ${TESTING_DIR_NAME}`,
//                 `echo bar >> ${commited}`,
//                 `git add ${commited}`,
//                 `git commit -m test`
//             ].join(` && `));
//         } catch (e) {
//             ok = false;
//         }
//     });

//     it('committing will fail if the hook exit with a non-zero code', function () {
//         assume(ok).false();
//     });

//     after(function () {
//         execSync([
//             `cd ${TESTING_DIR_NAME}`,
//             `git reset HEAD`
//         ].join(` && `));

//         // reset package.json
//         utils.modifyPackageJson(
//             PACKAGE_JSON_PATH,
//             () => lastJson
//         );
//     });
// });

// Install batch
// describe('regression - install-batch.js', function () {
//     let ok = true;

//     before(function () {
//         try {
//             execSync([
//                 `cd ${TESTING_DIR_NAME}`,
//                 `npm run pce-install-batch`
//             ].join(` && `));
//         } catch (e) {
//             ok = false;
//         }
//     });

//     it('run install-batch.js without errors', function () {
//         assume(ok).true();
//     });

//     it('add config about "batch" in package.json successly', function () {
//         let json = utils.readPackageJson(PACKAGE_JSON_PATH);
//         assume(json.scripts[BATCH_NAME]).equals(BATCH_SCRIPT);
//         assume(json['pre-commit']).contains(BATCH_NAME);
//     });

//     it('copy "batch-callback.js" to "package.json"\'s dir and rename it to "pce-batch-callback.js"', function () {
//         assume(
//             fs.existsSync(`./${TESTING_DIR_NAME}/pce-batch-callback.js`)
//         ).true();
//     });
// });

// Git commit and trigger hook to run pce-batch.
// describe('regression - pce-batch.js', function () {
//     let ok = true;

//     before(function () {
//         // only remain "pce-batch" in "pre-commit" array
//         utils.modifyPackageJson(
//             PACKAGE_JSON_PATH,
//             json => {
//                 json['pre-commit'] = [BATCH_NAME];
//                 return json;
//             }
//         );

//         // git commit all files and do not trigger pre-commit hook
//         execSync([
//             `cd ${TESTING_DIR_NAME}`,
//             `git add .`,
//             `git commit -m test -n`
//         ].join(` && `));

//         // git commit, trigger pre-commit hook and run batch.js
//         try {
//             execSync([
//                 `cd ${TESTING_DIR_NAME}`,
//                 `touch batch_1.js batch_2.js batch_3.js`,
//                 `git add .`,
//                 `git commit -m test-batch`
//             ].join(` && `));
//         } catch (e) {
//             ok = false;
//         }
//     });

//     it('passed pre-commit hook and git commit successly', function () {
//         assume(ok).true();
//     });

//     it('batch.js really is triggered and run successly', function () {
//         let markFilePath = `./${TESTING_DIR_NAME}/batch_run_ok`;
//         assume(
//             fs.existsSync(markFilePath)
//         ).true();

//         let pathList = fs.readFileSync(markFilePath)
//             .toString()
//             .split(' ')
//             .filter(item => !!item && item !== os.EOL);
//         assume(pathList.length).equals(3);
//         assume(pathList).includes('./batch_1.js');
//         assume(pathList).includes('./batch_2.js');
//         assume(pathList).includes('./batch_3.js');
//     });
// });

// TODO: batch.js执行失败的用例

// Just to remove temporary testing dir
// This code should be always the bottom
if (process.argv.indexOf('--not-delete-sandbox') === -1) {
    describe('regression - finish testing', function () {
        it(`remove ${TESTING_DIR_NAME} after testing ends`, function () {
            execSync(`rm -rf ${TESTING_DIR_NAME}`);
        });
    });
}

