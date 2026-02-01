import { defineBackend } from "@aws-amplify/backend";

import { Stack } from "aws-cdk-lib";
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";
import { HttpIamAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";

import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { myFirstFunction } from "./my-first-function/resource";

const backend = defineBackend({
  auth,
  data,
  myFirstFunction,
});

// New API stack
const apiStack = backend.createStack("api-stack");

// IAM authorizer (works with your identityPool/guest credentials)
const iamAuthorizer = new HttpIamAuthorizer();

// Lambda integration (NOTE: access via backend.<name>.resources.lambda)
const httpLambdaIntegration = new HttpLambdaIntegration(
  "LambdaIntegration",
  backend.myFirstFunction.resources.lambda
);

// HTTP API
const httpApi = new HttpApi(apiStack, "HttpApi", {
  apiName: "myHttpApi",
  corsPreflight: {
    allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.OPTIONS],
    allowOrigins: ["*"],
    allowHeaders: ["*"],
  },
  createDefaultStage: true,
});

// Route: GET /hello
httpApi.addRoutes({
  path: "/hello",
  methods: [HttpMethod.GET],
  integration: httpLambdaIntegration,
  authorizer: iamAuthorizer,
});

// Allow your app’s (auth + unauth) roles to call the API
const apiPolicy = new Policy(apiStack, "ApiPolicy", {
  statements: [
    new PolicyStatement({
      actions: ["execute-api:Invoke"],
      resources: [`${httpApi.arnForExecuteApi("*", "/hello")}`],
    }),
  ],
});

backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(apiPolicy);
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(apiPolicy);

// Write API info into amplify_outputs.json
backend.addOutput({
  custom: {
    API: {
      [httpApi.httpApiName!]: {
        endpoint: httpApi.url,
        region: Stack.of(httpApi).region,
        apiName: httpApi.httpApiName,
      },
    },
  },
});
