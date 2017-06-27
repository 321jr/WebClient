var _ = require('lodash');
var fs = require('fs');
var util = require('util');
var path = require('path');
var appVersion = '3.8.17';
var apiVersion = '1';
var dateVersion = new Date().toDateString();
var clientID = 'Web';
var clientSecret = '4957cc9a2e0a2a49d02475c9d013478d';
var BROWSERS = ['PhantomJS', 'Chrome', 'Firefox', 'Safari'];
var API_TARGETS = {
    blue: 'https://protonmail.blue/api',
    beta: 'https://beta.protonmail.com/api',
    prod: 'https://mail.protonmail.com/api',
    dev: 'https://dev.protonmail.com/api',
    v2: 'https://v2.protonmail.com/api',
    local: 'https://protonmail.dev/api',
    host: 'https://protonmail.host/api',
    build: '/api'
};
var autoprefixer = require('autoprefixer');
var browserslist = require('./browserslist');

const getCountry = (lang) => {
    const key = (lang === 'en') ? 'us' : lang;
    return key.toUpperCase();
};


/**
 * Create a list of available translations for the applications
 * Format: xx_XX
 * @return {Array}
 */
const listAvailableTranslations = () => {
    return fs.readdirSync(path.relative(__dirname, './po'))
        .filter((file) => path.extname(file) === '.po')
        .map((file) => path.basename(file, '.po'))
        .map((name) => `${name}_${getCountry(name)}`);
};

const TRANSLATIONS_APP = listAvailableTranslations();


module.exports = function(grunt) {
    var serveStatic = require('serve-static');


    grunt.loadTasks('tasks');
    require('load-grunt-tasks')(grunt);

    function apiUrl() {
        var api = API_TARGETS.build;
        var option = grunt.option('api');

        if(option && API_TARGETS[option]) {
            api = API_TARGETS[option];
        }

        return api;
    }

    const isDistRelease = () => ['prod', 'beta'].indexOf(apiUrl) !== -1;

    // Expose each supported browser as a command-line option
    function browsers() {
        var selected = _.filter(BROWSERS, function(browser) {
            return grunt.option(browser.toLowerCase());
        });

        return _.isEmpty(selected) ? [BROWSERS[0]] : selected;
    }

    var userConfig = require('./conf.build.js');

    var taskConfig = {
        pkg: grunt.file.readJSON('package.json'),
        meta: {
            banner: "/**\n" +
            " * <%= pkg.name %> - <%= pkg.version %> - <%= grunt.template.today('yyyy-mm-dd HH:MM:ss') %>\n" +
            " *\n" +
            " * copyright <%= grunt.template.today('yyyy') %> <%= pkg.author %>\n" +
            " * <%= pkg.license %>\n" +
            " */\n"
        },

        browserSync: {
          default_options: {
            bsFiles: {
              src: [
                  "<%= build_dir %>/assets/application.css",
                  "<%= build_dir %>/src/app"
              ]
            },
            options: {
              open: !grunt.option('no-open'),
              watchTask: true,
              proxy: "localhost:8080"
            }
          }
      },

        notify_hooks: {
            options: {
                enabled: true,
                title: 'ProtonMail Angular', // defaults to the name in package.json, or will use project directory's name
                success: false, // whether successful grunt executions should be notified automatically
                duration: 3 // the duration of notification in seconds, for `notify-send only
            }
        },

        ngconstant: {
            options: {
                name: 'proton.config',
                dest: 'src/app/config.js'
            },
            dev: {
                constants: {
                    CONFIG: {
                        debug: true,
                        apiUrl: apiUrl(),
                        app_version: appVersion,
                        api_version: apiVersion,
                        date_version: dateVersion,
                        clientID: clientID,
                        clientSecret: clientSecret,
                        articleLink: grunt.option('article') || 'https://protonmail.com/blog/protonmail-v3-8-release-notes/',
                        year: (new Date()).getFullYear(),
                        translations: TRANSLATIONS_APP
                    }
                }
            },
            prod: {
                constants: {
                    CONFIG: {
                        debug: false,
                        apiUrl: apiUrl(),
                        app_version: appVersion,
                        api_version: apiVersion,
                        date_version: dateVersion,
                        clientID: clientID,
                        clientSecret: clientSecret,
                        year: (new Date()).getFullYear(),
                        translations: TRANSLATIONS_APP
                    }
                }
            }
        },

        clean: {
            build: [
                "<%= build_dir %>"
            ],
            dist: [
                "<%= compile_dir %>"
            ]
        },

        babel: {
            options: {
                sourceMap: true
            },
            watch: {
                files: [{
                    src: [
                        'src/app/*.js',
                        'src/app/**/*.js',
                        'src/app/**/**/*.js',
                        '!src/app/translations.js',
                        '!src/app/libraries/**/*.js',
                        'src/app/libraries/pmcrypto.js', // Do babel on pmcrypto
                        '!src/app/templates/templates-app.js'
                    ],
                    dest: "<%= build_dir %>",
                    cwd: ".",
                    filter: 'isFile',
                    expand: true
                }]
            },
            dist: {
                files: [{
                    src: [
                        '<%= build_dir %>/src/app/**/*.js',
                        '!<%= build_dir %>/src/app/libraries/**/*.js',
                        '!<%= build_dir %>/src/app/translations.js',
                        '<%= build_dir %>/src/app/libraries/pmcrypto.js', // Do babel on pmcrypto
                        '!<%= build_dir %>/src/app/templates/templates-app.js'
                    ],
                    dest: ".",
                    cwd: ".",
                    filter: 'isFile',
                    expand: true
                }]
            }
        },

        connect: {
            options: {
                hostname: '*',
                port: 8080,
                middleware: function(connect, options, middlewares) {
                    var base = options.base[0];

                    return [
                        serveStatic(base),
                        function(req, res, next) {
                            // no file found; send app.html
                            var file = base + '/app.html';
                            if (grunt.file.exists(file)) {
                                require('fs').createReadStream(file).pipe(res);
                                return;
                            }
                            res.statusCode(404);
                            res.end();
                        }
                    ];
                }
            },

            compile: {
                options: {
                    base: '<%= compile_dir %>'
                }
            },

            watch: {
                options: {
                    base: '<%= build_dir %>'
                }
            }
        },

        copy: {
            i18n: {
                files: [{
                    src: ["*.json"],
                    dest: "<%= build_dir %>/i18n/",
                    cwd: "src/i18n",
                    expand: true
                }]
            },
            i18n_compile: {
                files: [{
                    src: ["*.json"],
                    dest: "<%= compile_dir %>/i18n/",
                    cwd: "src/i18n",
                    expand: true
                }]
            },
            build_app_assets: {
                files: [{
                    src: ["**"],
                    dest: "<%= build_dir %>/assets/",
                    cwd: "src/assets",
                    expand: true
                }]
            },
            build_appjs: {
                files: [{
                    src: ["<%= app_files.js %>"],
                    dest: "<%= build_dir %>",
                    cwd: ".",
                    filter: 'isFile',
                    expand: true
                }]
            },
            build_vendorjs: {
                files: [{
                    src: ["<%= vendor_files.js %>"],
                    dest: "<%= build_dir %>/vendor",
                    cwd: ".",
                    expand: true,
                    flatten: true,
                    nonull: true
                }]
            },
            compile_assets: {
                files: [{
                    src: ["**", "!*.css"],
                    dest: "<%= compile_dir %>/assets",
                    cwd: "<%= build_dir %>/assets",
                    expand: true
                }]
            },
            build_external: {
                files: [{
                    src: ["<%= external_files.openpgp %>", "<%= external_files.manifest %>"],
                    dest: "./<%= build_dir %>/",
                    expand: true,
                    flatten: true,
                    nonull: true
                }]
            },
            compile_external: {
                files: [{
                    src: ["<%= external_files.openpgp %>", "<%= external_files.manifest %>"],
                    dest: "./<%= compile_dir %>/",
                    expand: true,
                    flatten: true,
                    nonull: true
                }]
            },
            build_htaccess: {
                files: [{
                    src: [".htaccess"],
                    filter: "isFile",
                    expand: true,
                    dest: "<%= build_dir %>",
                    cwd: "./src",
                    nonull: true
                }]
            },
            compile_htaccess: {
                files: [{
                    src: [".htaccess"],
                    filter: "isFile",
                    expand: true,
                    dest: "<%= compile_dir %>",
                    cwd: "./src",
                    nonull: true
                }]
            },
        },

        sass: {
            build: {
                options: {
                    loadPath: "<%= vendor_files.sass_include_dirs %>"
                },
                files: {
                    "<%= build_dir %>/assets/application.css": "<%= app_files.sass %>"
                }
            }
        },

        concat: {
            build_css: {
                files: {
                    '<%= build_dir %>/assets/vendor.css': ['<%= vendor_files.css %>']
                },
                nonull: true
            },
            compile_js: {
                options: {
                    sourceMap: true,
                    banner: "<%= meta.banner %>"
                },
                files: {
                    '<%= compile_dir %>/assets/app.js': ['<%= vendor_files.js %>',
                    '<%= build_dir %>/src/app/**/index.js',
                    '<%= build_dir %>/src/app/**/*.js',
                    ]
                },
                nonull: true
            }
        },
        cssmin: {
            compile: {
                src: ["<%= build_dir %>/assets/**/*.css"],
                dest: "<%= compile_dir %>/assets/app.css"
            }
        },
        postcss: {
                options: {
                    map: true,
                    processors: [
                        autoprefixer(browserslist)
                    ]
                },
                dist: {
                    src: ["<%= build_dir %>/**/*.css"],
                }
        },
        html2js: {
            app: {
                options: {
                    base: "src/app"
                },
                src: ["<%= app_files.atpl %>"],
                dest: "<%= build_dir %>/src/app/templates/templates-app.js"
            }
        },

        protractor_webdriver: {
            build: {
                options: {
                    keepAlive: true,
                    path: "./node_modules/.bin/"
                }
            }
        },

        ngAnnotate: {
            options: {
                singleQuotes: true
            },
            compile: {
                files: [{
                    src: ['<%= build_dir %>/js/*.js'],
                    expand: true
                }]
            }
        },

        uglify: {
            options: {
                mangle: false,
                sourceMap: true,
                sourceMapIncludeSources : true,
                sourceMapIn : '<%= compile_dir %>/assets/app.js.map',
                preserveComments: false,
                report: 'min'
            },
            compile: {
                options: {
                    banner: "<%= meta.banner %>"
                },
                files: {
                    '<%= compile_dir %>/assets/app.js': '<%= compile_dir %>/assets/app.js'
                }
            }
        },

        index: {
            options: {
                apiUrl: apiUrl()
            },
            build: {
                dir: '<%= build_dir %>',
                src: [
                    '<%= build_dir %>/openpgp.min.js',
                    '<%= build_dir %>/src/**/index.js',
                    '<%= build_dir %>/src/**/*.js',
                    '<%= vendor_files.included_js %>',
                    '<%= build_dir %>/assets/application.css',
                    '<%= build_dir %>/assets/vendor.css'
                ],
                deployment: false
            },

            compile: {
                dir: '<%= compile_dir %>',
                src: [
                    '<%= compile_dir %>/openpgp.min.js',
                    '<%= compile_dir %>/assets/app.js',
                    '<%= compile_dir %>/assets/app.css'
                ],
                deployment: true
            }
        },

        cachebreaker: {
            dev: {
                options: {
                    match: [{
                        'assets/app.css': '<%= compile_dir %>/assets/app.css',
                        'assets/app.js': '<%= compile_dir %>/assets/app.js',
                        'openpgp.min.js': '<%= build_dir %>/openpgp.min.js', // 'build' is correct here
                        'openpgp.worker.min.js': '<%= build_dir %>/openpgp.worker.min.js' // 'build' is correct here
                    }],
                    replacement: 'md5'
                },
                files: { // This breaks if the 'cwd' option is used. I don't know why.
                    src: [
                        '<%= compile_dir %>/app.html',
                        '<%= compile_dir %>/assets/app.js',
                        '<%= compile_dir %>/openpgp.min.js',
                        '<%= compile_dir %>/openpgp.worker.min.js'
                    ]
                }
            }
        },

        delta: {
            options: {
                spawn: false
            },

            html: {
                files: ["<%= app_files.html %>"],
                tasks: ["index:build"]
            },

            sass: {
                files: [
                    "src/sass/**/*.scss"
                ],
                tasks: ["sass:build"]
            },

            css: {
                files: ["<%= build_dir %>/assets/**/*.css"]
            },

            tpls: {
                files: ["<%= app_files.atpl %>"],
                tasks: ["html2js"]
            },

            jssrc: {
                files: ["<%= app_files.js %>"],
                tasks: ['changed:babel:watch', "index:build"]
            },

            assets: {
                files: ["src/assets/**/*"],
                tasks: ["copy:build_app_assets"]
            },

            gruntfile: {
                files: "Gruntfile.js",
                tasks: [],
                options: {
                    livereload: false
                }
            }

        },

        shell: {
            setup_dist: {
                command: function() {
                    var commands = [];
                    var option = 'deploy3';

                    if (grunt.option('dest')) {
                        option = grunt.option('dest');
                    }

                    commands.push('git fetch origin ' + option + ':' + option);
                    commands.push('git clone file://$PWD --depth 1 --single-branch --branch ' + option + ' dist');
                    commands.push('cd dist');
                    commands.push('rm -rf *');

                    return commands.join('&&');
                }
            },
            push: {
                command: function() {
                    var commands = [];
                    var option = 'deploy3';

                    if (grunt.option('dest')) {
                        option = grunt.option('dest');
                    }

                    commands.push('cd dist');
                    commands.push('(git ls-files --deleted -z  || echo:) | xargs -0 git rm');
                    commands.push('git add --all');
                    commands.push('git commit -m "New Release"');
                    commands.push('git push origin ' + option);
                    commands.push('cd ..');
                    commands.push('git push origin ' + option);

                    return commands.join('&&');
                }
            },
            lint: {
                command: 'npm run lint'
            },
            i18n: {
                command() {

                    if (isDistRelease()) {
                        return 'npm run i18n';
                    }
                    return 'echo "no i18n for dev/blue etc."';
                }
            }

        },

        wait: {
            push: {
                options: {
                    delay: 3000
                }
            }
        },

        nggettext_extract: {
            pot: {
                options: {
                    attributes: ['placeholder-translate', 'title-translate', 'pt-tooltip-translate']
                },
                files: {
                    'po/template.pot': ['<%= app_files.js %>', '<%= app_files.atpl %>', '<%= app_files.html %>']
                }
            }
        },

        nggettext_compile: {
            all: {
                options: {
                    format: 'json'
                },
                files: [{
                    expand: true,
                    src: 'po/*.po',
                    flatten: true,
                    dest: 'src/i18n/',
                    ext: '.json',
                    rename(dest, matchedSrcPath) {
                        const [ lang, ext ] = matchedSrcPath.split('.');
                        return path.join(dest, `${lang}_${getCountry(lang)}.${ext}`);
                    }
                }]
            }
        }
    };

    // Project config
    grunt.initConfig(grunt.util._.extend(taskConfig, userConfig));
    grunt.loadNpmTasks('grunt-postcss');
    grunt.loadNpmTasks('grunt-browser-sync');
    grunt.renameTask('watch', 'delta');

    grunt.registerTask('watch', [
        'notify_hooks',
        'ngconstant:dev',
        'build',
        'connect:watch',
        'browserSync',
        'delta'
    ]);

    grunt.registerTask('deploy', [
        'clean:dist', // clean dist directory
        'nggettext_extract', // extract key inside JS and HTML files
        'nggettext_compile', // transform po file to translations.js
        'shell:setup_dist',
        'ngconstant:prod', // set prod variables
        'shell:lint',
        'build',
        'copy:compile_assets', // copy assets
        'copy:compile_htaccess', // copy htaccess file
        'copy:i18n',
        'copy:i18n_compile',
        'cssmin', // minify CSS
        'concat:compile_js', // concat JS
        'uglify', // minify JS
        'copy:compile_external', // copy openpgp
        'index:compile', // index CSS and JS
        'cachebreaker', // Append an MD5 hash of file contents to JS and CSS references
        'shell:push', // push code to deploy branch
        'wait:push',
        'shell:i18n'
    ]);

    grunt.registerTask('build', [
        'clean:build',
        'html2js',
        'sass:build',
        'concat:build_css',
        'postcss',
        'copy:build_app_assets',
        'copy:build_appjs',
        'copy:build_vendorjs',
        'copy:build_external',
        'copy:build_htaccess',
        'copy:i18n',
        'ngAnnotate',
        'babel:dist',
        'index:build'
    ]);
};
