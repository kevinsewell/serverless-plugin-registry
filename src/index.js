"use strict";

const BbPromise = require("bluebird");
const _ = require("lodash");

/**
 * @classdesc   Register function names with AWS SSM Parameter Store
 * @class       ServerlessPluginRegistry
 */
class ServerlessPluginRegistry {

    /**
     * @constructor
     *
     * @param serverless
     * @param options
     */
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options;
        this.provider = serverless.getProvider("aws");

        this.commands = {
            registry: {
                usage: "Register function names with AWS SSM Parameter Store",
                lifecycleEvents: ["registry"]
            }
        };

        this.hooks = {
            "registry:registry": () => {
                this.serverless.cli.generateCommandsHelp(["registry"]);
                return BbPromise.resolve();
            },
            "after:package:initialize": this.afterPackageInitialize.bind(this),
        };
    }

    afterPackageInitialize() {
        const allFunctions = this.serverless.service.getAllFunctions();

        allFunctions.forEach(functionName => {
            const function_ = this.serverless.service.getFunction(functionName);
            const fqFunctionName = function_.name;
            const functionNameParameterLogicalId =
                this.provider.naming.getNormalizedFunctionName(functionName) + "FunctionNameParameter";

            let functionParametersBaseName = this.getFunctionParametersBaseName(functionName, function_);

            _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, {
                [functionNameParameterLogicalId]: {
                    Type: "AWS::SSM::Parameter",
                    Properties: {
                        Name: functionParametersBaseName + "/FunctionName",
                        Type: "String",
                        Value: fqFunctionName
                    },
                },
            });

        });

        return BbPromise.resolve();
    }

    getFunctionParametersBaseName(functionName, function_) {
        if (function_.registry &&
            function_.registry.name) {

            return function_.registry.baseName;
        }

        if (this.serverless.service.custom &&
            this.serverless.service.custom.registry &&
            this.serverless.service.custom.registry.baseName) {

            return this.serverless.service.custom.registry.baseName + "/" + functionName;
        }

        return "/" + this.serverless.service.provider.stage + "/" + functionName;
    }
}

/** Export ServerlessPluginRegistry class */
module.exports = ServerlessPluginRegistry;
