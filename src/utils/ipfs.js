import { create } from "ipfs-http-client";
import axios from "axios";
import FormData from "form-data";

const useInfura = process.env.USE_INFURA === "true";

let ipfsClient;

if (useInfura) {
  const projectId = process.env.IPFS_PROJECT_ID;
  const projectSecret = process.env.IPFS_PROJECT_SECRET;
  const auth =
    "Basic " + Buffer.from(projectId + ":" + projectSecret).toString("base64");

  ipfsClient = create({
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https",
    headers: {
      authorization: auth,
    },
  });
} else {
  const microserviceURL =
    process.env.IPFS_MICROSERVICE_URL || "http://localhost:4000";

  ipfsClient = {
    add: async (file, type) => {
      const formData = new FormData();
      formData.append("file", file, `kycDocument.${type}`);

      const res = await axios.post(`${microserviceURL}/upload`, formData, {
        headers: formData.getHeaders(),
      });

      return {
        path: res.data.hash,
        cid: res.data.hash,
        url: res.data.url,
      };
    },

    cat: async (hash) => {
      const res = await axios.get(`${microserviceURL}/file/${hash}`, {
        responseType: "arraybuffer",
      });
      return res.data;
    },
  };
}

export { ipfsClient };
