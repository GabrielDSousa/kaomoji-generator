/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */

const path = require("path");

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false,
});

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

// Setup our static files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

// Formbody lets us parse incoming forms
fastify.register(require("@fastify/formbody"));

// View is a templating manager for fastify
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});

/**
 * Our old home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */
fastify.get("/", function (request, reply) {
  // params is an object we'll pass to our handlebars template
  let params = { seo: seo };

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/src/pages/index.hbs", params);
});

// Load and parse SEO data
const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

// Define route for the index page
fastify.post("/", async (request, reply) => {
  // params is an object we'll pass to our handlebars template
  let params = { seo: seo };

  // Get the word from the query parameters
  const word = request.body.word;

  if (word) {
    try {
      // Generate kaomoji using ChatGPT engine
      const kaomoji = await generateKaomoji(word);
      
       params = {
        kaomoji: kaomoji,
        word: null,
        error: false,
        seo: seo,
      };
    } catch (error) {
      console.error(error);
      params = {
        kaomoji: null,
        word: word,
        error: true,
        seo: seo,
      };      
    }
    
    return reply.view("/src/pages/index.hbs", params);
  }
});

// Function to generate kaomoji using the OpenAI library
async function generateKaomoji(word) {
  const prompt = `You are given a sentence with a maximum of 4 words: "${word}". Generate a kaomoji withou emoji or emoticon to express the sentiment of the sentence or something related to the action of the verb. Don't use words only the Kaomoji.`
  const maxTokens = 100; // Adjust the number of tokens based on OpenAI's API limits


  const chatCompletion = await openai.createCompletion(
  {
    model: "text-davinci-003",
    prompt: prompt,
    temperature: 0.8,
  }
);
  
  // Extract the generated kaomoji from the OpenAI API response
  const choices = chatCompletion.data.choices;
  if (choices && chatCompletion.data.choices.length > 0) {
    const generatedKaomoji = chatCompletion.data.choices[0].text;
    return generatedKaomoji;
  } else {
    throw new Error("No kaomoji generated.");
  }
}

/**
 * Our old home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */
fastify.get("/hello-node", function (request, reply) {
  // params is an object we'll pass to our handlebars template
  let params = { seo: seo };

  // If someone clicked the option for a random color it'll be passed in the querystring
  if (request.query.randomize) {
    // We need to load our color data file, pick one at random, and add it to the params
    const colors = require("./src/colors.json");
    const allColors = Object.keys(colors);
    let currentColor = allColors[(allColors.length * Math.random()) << 0];

    // Add the color properties to the params object
    params = {
      color: colors[currentColor],
      colorError: null,
      seo: seo,
    };
  }

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/src/pages/hello-node.hbs", params);
});

/**
 * Our POST route to handle and react to form submissions
 *
 * Accepts body data indicating the user choice
 */
fastify.post("/hello-node", function (request, reply) {
  // Build the params object to pass to the template
  let params = { seo: seo };

  // If the user submitted a color through the form it'll be passed here in the request body
  let color = request.body.color;

  // If it's not empty, let's try to find the color
  if (color) {
    // Load our color data file
    const colors = require("./src/colors.json");

    // Take our form submission, remove whitespace, and convert to lowercase
    color = color.toLowerCase().replace(/\s/g, "");

    // Now we see if that color is a key in our colors object
    if (colors[color]) {
      // Found one!
      params = {
        color: colors[color],
        colorError: null,
        seo: seo,
      };
    } else {
      // No luck! Return the user value as the error property
      params = {
        colorError: request.body.color,
        seo: seo,
      };
    }
  }

  // The Handlebars template will use the parameter values to update the page with the chosen color
  return reply.view("/src/pages/index.hbs", params);
});

// Run the server and report out to the logs
fastify.listen(
  { port: process.env.PORT, host: "0.0.0.0" },
  function (err, address) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Your app is listening on ${address}`);
  }
);
