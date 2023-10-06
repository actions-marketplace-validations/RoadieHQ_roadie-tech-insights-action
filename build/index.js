"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const yaml = __importStar(require("yaml"));
const fs = __importStar(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const github_1 = require("@actions/github");
const catalog_model_1 = require("@backstage/catalog-model");
const API_URL = 'https://api.roadie.so/api/tech-insights/v1';
const ACTION_TYPE = 'run-on-demand';
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const scorecardId = core.getInput('check-id');
    const checkId = core.getInput('scorecard-id');
    const catalogInfoPath = (_a = core.getInput('catalog-info-path')) !== null && _a !== void 0 ? _a : './catalog-info.yaml';
    const apiToken = core.getInput('api-token');
    function getEntitySelector(x, base) {
        const parsed = Number.parseInt(x, base);
        if (Number.isNaN(parsed)) {
            return 0;
        }
        return parsed;
    }
    const entitySelector = getEntitySelector(core.getInput('entity-selector'), 10);
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
    const triggerOnDemandRun = (entities) => __awaiter(void 0, void 0, void 0, function* () {
        var _b, _c;
        const entityRef = entities.map(it => (0, catalog_model_1.stringifyEntityRef)(it))[entitySelector];
        const branchRef = (_c = (_b = github_1.context.payload.pull_request) === null || _b === void 0 ? void 0 : _b.head) === null || _c === void 0 ? void 0 : _c.ref;
        const urlPostfix = checkId
            ? `checks/${checkId}/action`
            : `scorecards/${scorecardId}/action`;
        const triggerResponse = yield (0, node_fetch_1.default)(`${API_URL}/${urlPostfix}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiToken}` },
            body: JSON.stringify({
                type: ACTION_TYPE,
                payload: {
                    entityRef,
                    branchRef,
                },
            }),
        });
        return yield triggerResponse.json();
    });
    try {
        const content = fs.readFileSync(catalogInfoPath, 'utf8');
        const roadieManifest = yaml.parseAllDocuments(content);
        if (roadieManifest == null || roadieManifest.length < 1) {
            core.setFailed(`No catalog-info file matching the path ${catalogInfoPath} found`);
            console.warn(`No catalog-info file matching the path ${catalogInfoPath} found`);
            return;
        }
        const parsedManifest = roadieManifest.map(yamlDoc => yamlDoc.toJS());
        const onDemandResult = yield triggerOnDemandRun(parsedManifest);
        console.log(onDemandResult);
        return;
    }
    catch (error) {
        core.setFailed(error.message);
    }
});
run();
//# sourceMappingURL=index.js.map