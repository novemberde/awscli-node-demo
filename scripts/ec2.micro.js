const execa = require('execa');
const {Signale} = require('signale');
const signale = new Signale();

const moment = require('moment');
const timeFormat = 'YYYYMMDD HH:mm:ss';

const profile = process.env.CLI_PROFILE;
const asyncStdIn = () => new Promise((resolve, reject) => {
    const p = process.stdin.on('data', data => {
        const str = data.toString().split("\n")[0];
        if(!str || str.length < 3) return;

        str.trim();
        resolve(str);
    }).on('error', err => reject(err));
});

const main = async () => {
    try {
        if(!profile) throw new Error(`CLI_PROFILE should be defined`);
        signale.success(`${moment().format(timeFormat)} AWSCLI Profile: ${profile}`);

        const describedVpcs = JSON.parse((await execa.shell(`aws ec2 describe-vpcs --profile ${profile}`)).stdout);
        signale.info(describedVpcs);
        
        process.stdout.write("VPC ID: ");
        const vpcId = await asyncStdIn();
        
        process.stdout.write("SecurityGroup name: ");
        const securityGroupName = await asyncStdIn();

        process.stdout.write("SecurityGroup description: ");
        const securityGroupDesc = await asyncStdIn();
        const sgResult = JSON.parse((await execa.shell(`aws ec2 create-security-group \
        --group-name ${securityGroupName} --description ${securityGroupDesc} --vpc-id ${vpcId} \
        --profile ${profile}`)).stdout);

        const sgId = sgResult.GroupId;
        await execa.shell(`aws ec2 authorize-security-group-ingress --group-id ${sgId} --protocol tcp --port 80 --cidr 0.0.0.0/0 --profile ${profile}`)
        await execa.shell(`aws ec2 authorize-security-group-ingress --group-id ${sgId} --protocol tcp --port 22 --cidr 0.0.0.0/0 --profile ${profile}`)

        process.stdout.write("Key Name: ");
        const keyName = await asyncStdIn();
        await execa.shell(`aws ec2 create-key-pair --key-name ${keyName} --query 'KeyMaterial' --output text > ${keyName}.pem --profile ${profile}`)
        await execa.shell(`chmod 400 ${keyName}.pem`)

        const describedSubnets = JSON.parse((await execa.shell(`aws ec2 describe-subnets --filters "Name=vpc-id,Values=${vpcId}" --query 'Subnets[*].{ID:SubnetId,CIDR:CidrBlock}' --profile ${profile}`)).stdout);
        signale.info(describedSubnets);
        
        // Ubuntu image
        const ec2Result = (await execa.shell(`aws ec2 run-instances --image-id ami-00ca7ffe117e2fe91 \
        --subnet-id ${describedSubnets[0].ID} \
        --security-group-ids ${sgId} \
        --count 1 \
        --instance-type t2.micro \
        --key-name ${keyName} \
        --query 'Instances[0].InstanceId' \
        --profile ${profile}`)).stdout;

        signale.success(`${moment().format(timeFormat)} ${ec2Result} is successfully created!`);
        process.exit(0);
    } catch (err) {
        signale.error(err);
        process.exit(1);
    }
}


main();


