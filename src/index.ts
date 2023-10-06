import * as core from '@actions/core';
import * as yaml from 'yaml';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { context } from '@actions/github';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';

const API_URL = 'https://api.roadie.so/api/tech-insights/v1';
const ACTION_TYPE = 'run-on-demand';

const run = async () => {
  const scorecardId = core.getInput('check-id');
  const checkId = core.getInput('scorecard-id');
  const catalogInfoPath =
    core.getInput('catalog-info-path') ?? './catalog-info.yaml';
  const apiToken = core.getInput('api-token');

  function getEntitySelector(x: string, base: number) {
    const parsed = Number.parseInt(x, base);
    if (Number.isNaN(parsed)) {
      return 0;
    }
    return parsed;
  }

  const entitySelector = getEntitySelector(
    core.getInput('entity-selector'),
    10,
  );

  if (!checkId && !scorecardId) {
    core.setFailed(`No 'check-id' or 'scorecard-id' configured.`);
    console.warn(`No checkId or scorecardId configured. Cannot continue.`);
    return;
  }

  if (checkId && scorecardId) {
    core.setFailed(`Only one of 'check-id' or 'scorecard-id' can be input.`);
    console.warn(`Both checkId and scorecardId configured. Cannot continue.`);
    return;
  }

  if (!apiToken || apiToken === '') {
    core.setFailed(`No api-token input value found.`);
    console.warn(`No api-token input value found. Cannot continue.`);
    return;
  }

  const triggerOnDemandRun = async (entities: Entity[]): Promise<any> => {
    const entityRef = entities.map(it => stringifyEntityRef(it) as string)[
      entitySelector
    ];
    const branchRef = context.payload.pull_request?.head?.ref;
    const urlPostfix = checkId
      ? `checks/${checkId}/action`
      : `scorecards/${scorecardId}/action`;

    const triggerResponse = await fetch(`${API_URL}/${urlPostfix}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        type: ACTION_TYPE,
        payload: {
          entityRef,
          branchRef,
        },
      }),
    });
    return await triggerResponse.json();
  };

  try {
    const content = fs.readFileSync(catalogInfoPath, 'utf8');
    const roadieManifest = yaml.parseAllDocuments(content);
    if (roadieManifest == null || roadieManifest.length < 1) {
      core.setFailed(
        `No catalog-info file matching the path ${catalogInfoPath} found`,
      );
      console.warn(
        `No catalog-info file matching the path ${catalogInfoPath} found`,
      );
      return;
    }
    const parsedManifest = roadieManifest.map(yamlDoc => yamlDoc.toJS());

    const onDemandResult = await triggerOnDemandRun(parsedManifest);
    console.log(onDemandResult);
    return;
  } catch (error) {
    core.setFailed((error as Error).message);
  }
};

run();
