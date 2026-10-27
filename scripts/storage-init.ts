import "dotenv/config";
import {
  HeadBucketCommand,
  CreateBucketCommand,
  type BucketLocationConstraint,
} from "@aws-sdk/client-s3";
import { storage } from "../src/lib/storage/index";
const client = storage();
try {
  await client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }));
  console.info("Private storage bucket is accessible.");
} catch (error) {
  if (
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode !== 404
  )
    throw error;
  await client.send(
    new CreateBucketCommand({
      Bucket: process.env.S3_BUCKET,
      ...(!process.env.S3_ENDPOINT && process.env.S3_REGION !== "us-east-1"
        ? {
            CreateBucketConfiguration: {
              LocationConstraint: process.env
                .S3_REGION as BucketLocationConstraint,
            },
          }
        : {}),
    }),
  );
  console.info("Storage bucket created. No public ACL was applied.");
}
