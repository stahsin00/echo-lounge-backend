import "dotenv/config.js";
import AWS from 'aws-sdk';

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

export const uploadToS3 = async (imageData) => {
    try {
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: `customer_${Date.now()}.png`,  // TODO: consider key collisions if trying to upload mutiple images at close time intervals
            Body: Buffer.from(imageData),
            ContentType: 'image/png'
        };

        const uploadData = await s3.upload(uploadParams).promise();
        return uploadData.Location;
    } catch (error) {
        console.error('Error uploading image to AWS S3:', error);
        throw error;
    }
}