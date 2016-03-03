Vagrant.configure(2) do |config|
  config.vm.box = "digital_ocean"
  config.vm.synced_folder ".", "/vagrant", disabled: true

  config.vm.define "benchmark" do |node|
    node.vm.provision "shell", inline: <<-SHELL
      sudo apt-get update
      sudo apt-get install -y python gcc make g++ git
      sudo apt-get install -y wget htop screen nano

      wget --quiet https://nodejs.org/dist/v4.3.0/node-v4.3.0-linux-x64.tar.gz
      tar -C /usr/local -zxf node-v4.3.0-linux-x64.tar.gz --strip 1

      screen -X -S app quit

      sudo rm -rf /orbit-db

      sudo mkdir /orbit-db
      cd /orbit-db

      git clone https://github.com/haadcode/orbit-db.git

      cd orbit-db
      npm install --production

      nohup screen -S app -d -m node examples/reader.js 178.62.241.75 benchmark b1 benchmark
    SHELL

    node.vm.provider :digital_ocean do |provider, override|
      override.ssh.private_key_path = "~/.ssh/digital-ocean"
      override.vm.box               = 'digital_ocean'
      override.vm.box_url           = "https://github.com/smdahlen/vagrant-digitalocean/raw/master/box/digital_ocean.box"
      provider.token                = '20f523cae97809404ccb5c8877d84e580bb200cd6d7eb05d8d63b453b46c7cc8'
      provider.image                = 'ubuntu-14-04-x64'
      provider.region               = 'AMS3'
      provider.size                 = '2GB'
    end
  end

end
