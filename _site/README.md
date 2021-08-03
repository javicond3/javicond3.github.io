

# Installation 

## Setup on your local machine
 * Clone or download the repository
 * You should have [ruby](https://www.ruby-lang.org/en/) installed in your system. Ruby Version 2.5.7 and gem 3.1.2
 * Install bundler which helps in specifying and installing dependencies of any Ruby project ```gem install bundler``` version 2.1.4
 * Go to the root of the repo and run this - ```bundle install```
 * Then - ```bundle exec jekyll serve --host=127.0.0.1```

## Update the repo
 * ``` git push origin development ```

## Update the github page
 * Desde la rama stable debes generar el build
 * ```bundle exec jekyll build```
 * Copy the content inside _site to master branch.  
 * Open [https://javicond3.github.io/](https://javicond3.github.io/)
 * Existe un workflow con github actions para copiar _site a la rama main




# Configuration 
 * Change the ```_config.yml```
 
 
# Licensce

Open sourced under MIT LICENSE


# Similar repos
[Similar theme github](https://github.com/thinker3197/ink)