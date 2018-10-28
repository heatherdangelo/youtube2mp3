const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const fs = require('fs');
const url = require('url');
const youtubedl = require('youtube-dl');
const ffmpeg = require('fluent-ffmpeg');

function isYouTubeVideoURL(youtubeUrl) {
  let parsedUrl;
  try {
    parsedUrl = url.parse(youtubeUrl, true);
  } catch (e) {
    return false;
  }

  return parsedUrl.host === 'www.youtube.com';
}

function getYouTubeVideoId(youtubeUrl) {
  const youtubeUrlParts = url.parse(youtubeUrl, true);

  const { query } = youtubeUrlParts;

  return query.v;
}

function convert(youtubeUrl) {
  const videoUrl = youtubeUrl;

  if (!isYouTubeVideoURL(videoUrl)) {
    throw new Error('Video URL is unsupported (eg. https://www.youtube.com/watch?v=w63Jf-EYiNI)');
  }

  const videoId = getYouTubeVideoId(videoUrl);

  if (typeof videoId === 'undefined') {
    throw new Error('Video URL is missing video identifier (eg. https://www.youtube.com/watch?v=WIUrrp5KkCo)');
  }

  const video = youtubedl(videoUrl);

  video.on('info', (info) => {
    console.log('Download started');
    console.log(`filename: ${info.filename}`);
    console.log(`size: ${info.size}`);
  });

  const outputFile = `youtube/${videoId}.flv`;
  video.pipe(fs.createWriteStream(outputFile));

  return new Promise((resolve, reject) => {
    video.on('end', () => resolve({ file: outputFile, name: videoId }));
    video.on('error', error => reject(error));
  });
}

const optionList = [
  {
    name: 'url', alias: 'u', description: 'A full video url (eg. https://www.youtube.com/watch?v=w63Jf-EYiNI)', type: String,
  },
  {
    name: 'help', alias: 'h', type: Boolean,
  },
];
const optionsDescription = {
  header: 'Options',
  optionList,
};
const usageDescription = [
  {
    header: 'youtube2mp3',
    content: 'Converts a youtube video into an mp3 file.',
  },
];
usageDescription.push(optionsDescription);

const { url: youtubeUrl } = commandLineArgs(optionList);

if (typeof youtubeUrl === 'undefined') {
  console.log(commandLineUsage(usageDescription));
}

convert(youtubeUrl)
  .then(({ file, name }) => {
    const mp3Filename = `mp3/${name}.mp3`;
    console.log('Processing file', file);
    ffmpeg(file)
      .noVideo()
      .output(mp3Filename)
      .on('end', () => {
        console.log(`Created mp3 at ${mp3Filename}`);
      })
      .on('error', (error) => {
        console.log('Received error while converting youtube video.', error);
      })
      .run();
  });
