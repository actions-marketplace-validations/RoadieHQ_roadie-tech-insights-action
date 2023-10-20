import * as core from '@actions/core';
import * as yaml from 'yaml';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { context, getOctokit } from '@actions/github';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import isEmpty from 'lodash/isEmpty';

type CheckResultContents = {
  result: boolean;
  id: string;
  check_id: string;
  entity: string;
  created_at: string;
  last_updated_at: string;
  missing?: boolean;
  check: any;
};
type CheckResult = {
  entity: string;
  checkResults: CheckResultContents[];
};
type OnDemandCheckResult = {
  checkResults: CheckResult;
  factResults: {
    id: string;
    entity: string;
    facts: Record<string, any>;
  }[];
};

type ScorecardResultResponse = {
  data: Record<string, OnDemandCheckResult>;
};

type CheckResultResponse = {
  data: OnDemandCheckResult;
};

const isScorecardResponse = (
  it: ScorecardResultResponse | CheckResultResponse,
): it is ScorecardResultResponse => !('checkResults' in it.data);

const API_URL = 'https://api.roadie.so/api/tech-insights/v1';
const ACTION_TYPE = 'run-on-demand';

const run = async () => {
  let repoToken = core.getInput('repo-token');
  if (!repoToken) {
    repoToken = 'failed';
  }

  console.log(repoToken);
  const checkId = core.getInput('check-id');
  const scorecardId = core.getInput('scorecard-id');
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

  const triggerOnDemandRun = async (
    entities: Entity[],
  ): Promise<ScorecardResultResponse | CheckResultResponse> => {
    const entityRef = entities.map(it => stringifyEntityRef(it) as string)[
      entitySelector
    ];
    const branchRef = context.payload.pull_request?.head?.ref;

    const urlPostfix = !isEmpty(checkId)
      ? `checks/${checkId}/action`
      : `scorecards/${scorecardId}/action`;
    const url = `${API_URL}/${urlPostfix}`;
    console.log(
      `Running Tech Insights with parameters:  \nBranch:${branchRef}  \nEntityRef: ${entityRef}  \nCheck Id: ${checkId}  \nScorecard Id: ${scorecardId}.\n\n Calling URL: ${url}`,
    );

    const triggerResponse = await fetch(url, {
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
    return (await triggerResponse.json()) as ScorecardResultResponse;
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

    if (onDemandResult && isScorecardResponse(onDemandResult)) {
      console.log(JSON.stringify(onDemandResult));
      const results = Object.values(onDemandResult.data).map(result =>
        result.checkResults.checkResults.map(
          individualResult => individualResult.result,
        ),
      );
      console.log(results);

      const octokit = getOctokit(repoToken);
      await octokit.rest.issues.createComment({
        issue_number: context.payload.pull_request?.number!,
        owner: context.payload.repository?.owner.name!,
        repo: context.payload.repository?.name!,
        body: JSON.stringify(results),
      });
    }
    if (onDemandResult && !isScorecardResponse(onDemandResult)) {
      console.log(JSON.stringify(onDemandResult));
      const results = onDemandResult.data.checkResults.checkResults.map(
        individualResult => individualResult.result,
      );
      console.log(results);

      const octokit = getOctokit(repoToken);
      await octokit.rest.issues.createComment({
        issue_number: context.payload.pull_request?.number!,
        owner: context.payload.repository?.owner.name!,
        repo: context.payload.repository?.name!,
        body: JSON.stringify(results),
      });
    }

    return;
  } catch (error) {
    core.setFailed((error as Error).message);
  }
};

run();
