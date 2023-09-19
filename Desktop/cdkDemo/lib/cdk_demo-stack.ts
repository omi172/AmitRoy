import * as cdk from 'aws-cdk-lib';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import { Runtime } from '@aws-cdk/aws-lambda';
import * as  path from 'path'; 
import { Stack, StackProps } from 'aws-cdk-lib';
import { PolicyStatement, PolicyStatementProps } from 'aws-cdk-lib/aws-iam';
import * as iam from 'aws-cdk-lib/aws-iam'
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from '@aws-cdk/aws-apigatewayv2'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CdkDemoQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
    const bucket = new Bucket(this,'MySimpleAppBucket1',{
      encryption : BucketEncryption.S3_MANAGED,
    })
   

    const getPhotos = new lambda.NodejsFunction(this,'MySimpleAppLambda',{
        runtime : Runtime.NODEJS_12_X,
        entry : path.join(__dirname,'..','api', 'get-photos', 'index.ts'),
        handler : 'getPhotos',
        environment : {
          PHOTO_BUCKET_NAME : bucket.bucketName,
        }
    });
    const bucketContainerPermission = new iam.PolicyStatement();
    bucketContainerPermission.addResources(bucket.bucketArn);
    bucketContainerPermission.addActions('s3:ListBucket');

    const bucketPermission = new iam.PolicyStatement();
    bucketPermission.addResources(`${bucket.bucketArn}/*`);
    bucketPermission.addActions('s3:GetObject', 's3:PutObject');
    
    const policy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:ListBucket"],
          resources: [bucket.bucketArn],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: [`${bucket.bucketArn}/*`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:PutObject"],
          resources: [`${bucket.bucketArn}/*`],

        }),
      ]
    }); 
    
    
    const api = new apigateway.RestApi(this, 'api', {
      description: 'example api gateway',
      deployOptions: {
        stageName: 'dev',
      },
      // 👇 enable CORS
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowCredentials: true,
        allowOrigins: ['http://localhost:3000'],
      },
    });

    HttpApi.addRoutes({
      path : '/getAllPhotos',
      methods : [
        HttpMethod.GET,
      ],
      integration : apigateway.LambdaIntegration
    })
    
    new cdk.CfnOutput(this, 'MySimpleAppApi', {value: api.url!, exportName : 'MySimpleAppApiEndPoint'});
    new cdk.CfnOutput(this,'MySimpleAppBucketExport',{
      value : bucket.bucketName,
      exportName : 'MySimpleBucketName',
    });
  }
}
