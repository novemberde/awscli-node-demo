const execa = require('execa');
const {Signale} = require('signale');
const signale = new Signale();

// const profile = "workshopUser";
const profile = process.env.CLI_PROFILE;

const main = async () => {
    try {
        if(!profile) throw new Error(`CLI_PROFILE should be defined`);
        signale.success(`AWSCLI Profile: ${profile}`);

        const vpcResult = JSON.parse((await execa.shell(`aws ec2 create-vpc --cidr-block 10.0.0.0/16 --profile ${profile}`)).stdout);
        // signale.info(vpcResult);
        const vpcId = vpcResult.Vpc.VpcId;
        signale.success("VPC is created");

        await execa.shell(`aws ec2 create-subnet --vpc-id ${vpcId} --cidr-block 10.0.0.0/24 --profile ${profile}`)
        signale.success("Subnet 1 is created");

        await execa.shell(`aws ec2 create-subnet --vpc-id ${vpcId} --cidr-block 10.0.1.0/24 --profile ${profile}`)
        signale.success("Subnet 2 is created");
        
        const internetGatewayResult = JSON.parse((await execa.shell(`aws ec2 create-internet-gateway --profile ${profile}`)).stdout)
        // signale.info(internetGatewayResult);
        const internetGatewayId = internetGatewayResult.InternetGateway.InternetGatewayId;
        signale.success(`InternetGateway is created`);
        signale.success(`InternetGatewayId: ${internetGatewayId}`);

        await execa.shell(`aws ec2 attach-internet-gateway --vpc-id ${vpcId} --internet-gateway-id ${internetGatewayId} --profile ${profile}`)
        signale.success("InternetGateway is attached on VPC");
        
        const routeTableResult = JSON.parse((await execa.shell(`aws ec2 create-route-table --vpc-id ${vpcId} --profile ${profile}`)).stdout)
        const routeTableId = routeTableResult.RouteTable.RouteTableId;
        signale.success("RouteTable is created");
        
        await execa.shell(`aws ec2 create-route --route-table-id ${routeTableId} --destination-cidr-block 0.0.0.0/0 --gateway-id ${internetGatewayId} --profile ${profile}`)
        signale.success("Route is created");        
    } catch (err) {
        signale.error(err);
        process.exit(1);
    }
}

main();
