// A basic TypeScript agent that sends a JSON request to the Inhibitor

// Import axios for HTTP requests
import axios from 'axios';

// Define an async function that interacts with the Inhibitor
async function runAgent() {
  // Send a POST request to the production Inhibitor service
  const response = await axios.post('https://iaas.appliedai.studio/check', {
    // Inform the Inhibitor about the agent's contemplated action
    text: "Agent contemplating action: buy ETH.",
    // Choose the mode for the Inhibitor ("insight" or "performance")
    mode: "insight"
  });

  // Display the response from the Inhibitor
  console.log("Inhibitor response:", response.data);
}

// Start the agent
runAgent();
