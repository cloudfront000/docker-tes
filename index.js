import Docker from 'dockerode';
import dotenv from 'dotenv';

dotenv.config();

const docker = new Docker();

async function runContainer() {
  try {
    const image = 'ghcr.io/guru322/deploy-guru:latest';
    console.log(`Pulling image: ${image}...`);

    await new Promise((resolve, reject) => {
      docker.pull(image, (err, stream) => {
        if (err) {
          return reject(err);
        }
        docker.modem.followProgress(stream, onFinished, onProgress);

        function onFinished(err, output) {
          if (err) {
            return reject(err);
          }
          resolve(output);
        }

        function onProgress(event) {
          console.log(event.status);
        }
      });
    });

    console.log(`Creating and starting container from image: ${image}...`);

    const container = await docker.createContainer({
      Image: image,
      name: 'deploy-guru-container',
      Env: [
        `MY_ENV_VAR=${process.env.MY_ENV_VAR}`,
      ],
      HostConfig: {
        PortBindings: {
          '5000/tcp': [
            {
              HostPort: '5000'
            }
          ]
        }
      },
      ExposedPorts: {
        '5000/tcp': {}
      }
    });

    await container.start();
    console.log('Container started on port 5000.');

    container.logs({ stdout: true, stderr: true, follow: true }, (err, stream) => {
      if (err) {
        return console.error('Error attaching to container logs:', err);
      }
      stream.pipe(process.stdout);
    });

    const data = await container.wait();
    console.log('Container exited with status:', data.StatusCode);

    await container.remove();
    console.log('Container removed.');
  } catch (err) {
    console.error('Error running container:', err);
  }
}

runContainer();
