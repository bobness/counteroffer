const gulp = require('gulp');

gulp.task('default', ['copy-pc']);

gulp.task('copy-pc', ['copy-pc-frontend', 'copy-pc-backend']);

gulp.task('copy-pc-frontend', () => {
  const files = [
    'node_modules/portfolio-creator/public/**/*'
  ];
  return gulp.src(files)
    .pipe(gulp.dest('./public/co-app/portfolio-creator/'))
});

gulp.task('copy-pc-backend', () => {
  const files = [
    'node_modules/portfolio-creator/js/portfolio.js'
  ];
  return gulp.src(files)
    .pipe(gulp.dest('./routes/'));
})