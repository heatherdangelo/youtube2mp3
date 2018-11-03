#!/usr/bin/env node

const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const fs = require('fs');
const url = require('url');
const youtubedl = require('youtube-dl');
const ffmpeg = require('fluent-ffmpeg');

const YOUTUBE_VIDEO_DIRECTORY = 'youtube';
const MP3_DIRECTORY = 'mp3';

function createDirectoryIfNotExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }
}

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

function convert({ url }) {
  if (!isYouTubeVideoURL(url)) {
    throw new Error('Video URL is unsupported (eg. https://www.youtube.com/watch?v=w63Jf-EYiNI)');
  }

  const videoId = getYouTubeVideoId(url);

  if (typeof videoId === 'undefined') {
    throw new Error('Video URL is missing video identifier (eg. https://www.youtube.com/watch?v=WIUrrp5KkCo)');
  }

  const video = youtubedl(url);

  let friendlyName;
  video.on('info', (info) => {
    friendlyName = info._filename;

    console.log('Download started');
    console.log(`filename: ${info._filename}`);
    console.log(`size: ${info.size}`);
  });

  createDirectoryIfNotExists(YOUTUBE_VIDEO_DIRECTORY);
  const outputFile = `${YOUTUBE_VIDEO_DIRECTORY}/${videoId}.flv`;
  video.pipe(fs.createWriteStream(outputFile));

  return new Promise((resolve, reject) => {
    video.on('end', () => resolve({ file: outputFile, name: videoId, friendlyName }));
    video.on('error', error => reject(error));
  });
}

function parseCommandLineArguments() {
  const optionList = [
    {
      name: 'url', alias: 'u', description: 'A full video url \n Example: https://www.youtube.com/watch?v=w63Jf-EYiNI', type: String,
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

  const { url } = commandLineArgs(optionList);

  if (typeof url === 'undefined') {
    console.log(commandLineUsage(usageDescription));
    process.exit();
  }

  return { url };
}

convert(parseCommandLineArguments())
  .then(({ file, name, friendlyName }) => {
    const filename = friendlyName || name;

    createDirectoryIfNotExists(MP3_DIRECTORY);
    const mp3Filename = `${MP3_DIRECTORY}/${filename}.mp3`;

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
