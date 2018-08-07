#!/usr/bin/env node

import getArgv from './argv/getArgv';
import parseArgv from './argv/parseArgv';
import validateArgv from './argv/validateArgv';
import getCloudFrontInstance from './cloudfront/getCloudFrontInstance';
import getCloudFrontParams from './cloudfront/getCloudFrontParams';
import logger from './utils/logger';

const validRegex: RegExp = /\/(.*)\/([a-z]*)/g;

const argv = getArgv();
if (!validateArgv(argv)) {
  logger.error('Missing Required Argument(s)');
  process.exit(1);
}
const parsedArgv = parseArgv(argv);

if (parsedArgv.isPR) {
  logger.info(
    'Travis CI started due to pull request, update of CloudFront not performed.'
  );
  process.exit(0);
}

if (!isValidBranch(parsedArgv.branches, parsedArgv.travisBranch)) {
  logger.info(
    'Travis CI not running on ' +
      parsedArgv.travisBranch +
      ' branch, update of CloudFront' +
      ' not performed. Allowed branches: [' +
      parsedArgv.branches.join(', ') +
      '].'
  );
  process.exit(0);
}

const cloudFront = getCloudFrontInstance(parsedArgv);
const cloudFrontParams = getCloudFrontParams(parsedArgv);

cloudFront
  .createInvalidation(cloudFrontParams)
  .promise()
  .then(data => {
    logger.info(JSON.stringify(data));
    process.exit(0);
  })
  .catch(err => {
    logger.error('Error invalidating CloudFront Cache: ' + JSON.stringify(err));
    process.exit(1);
  });

function isValidBranch(branches: string[], currentBranch: string) {
  if (branches.indexOf(currentBranch.trim()) === -1) {
    // No exact plain text match
    // There might be a branch defined as a regexp
    const regexBranches: string[] = branches.filter((branch) => validRegex.test(branch[0]));
    for (let i = 0; i < regexBranches.length; i++) {
      const matchArray = validRegex.exec(regexBranches[i]);
      if (matchArray) {
        if (new RegExp(matchArray[1], matchArray[2]).test(currentBranch)) {
          return true;
        }
      }
    }
    return false;
  } else {
    return true;
  }
}
