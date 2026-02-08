const fs = require("fs");
const path = require("path");

const addresses = require("./deployed_addresses.json");
const mockToken = process.env.TOKEN_ADDRESS || "0x98BED93332690f8E6c5e928a1505283c539Bf4e7";

const newValues = {
    POOL_ADDRESS: addresses.POOL_ADDRESS,
    POLICY_ADDRESS: addresses.POLICY_ADDRESS,
    ESCROW_ADDRESS: addresses.ESCROW_ADDRESS,
    ORACLE_ADDRESS: addresses.ORACLE_ADDRESS,
    TOKEN_ADDRESS: mockToken
};

const updateEnvContent = (originalContent, newValues) => {
    let content = originalContent || "";
    for (const [key, value] of Object.entries(newValues)) {
        const regex = new RegExp(`^${key}=.*`, "m");
        if (regex.test(content)) {
            content = content.replace(regex, `${key}=${value}`);
        } else {
            content += `\n${key}=${value}`;
        }
    }
    return content;
};

const serverEnvPath = path.resolve(__dirname, "../server/.env");
const rootEnvPath = path.resolve(__dirname, "../.env");
const frontendEnvPath = path.resolve(__dirname, "../../Allinonetravelpaymentsapp/.env");

try {
    if (fs.existsSync(serverEnvPath)) {
        const content = fs.readFileSync(serverEnvPath, "utf8");
        fs.writeFileSync(serverEnvPath, updateEnvContent(content, newValues));
        console.log("Updated server/.env");
    }

    if (fs.existsSync(rootEnvPath)) {
        const content = fs.readFileSync(rootEnvPath, "utf8");
        fs.writeFileSync(rootEnvPath, updateEnvContent(content, newValues));
        console.log("Updated .env");
    }

    if (fs.existsSync(frontendEnvPath)) {
        const content = fs.readFileSync(frontendEnvPath, "utf8");
        fs.writeFileSync(frontendEnvPath, updateEnvContent(content, newValues));
        console.log("Updated frontend .env");
    }
} catch (err) {
    console.error("Error updating .env files:", err);
    process.exit(1);
}
