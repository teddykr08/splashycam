Pod::Spec.new do |s|
  s.name           = 'DualCamera'
  s.version        = '0.1.0'
  s.summary        = 'Splashy Cam dual (front + back) camera support check. Recording not yet implemented.'
  s.description    = s.summary
  s.license        = 'UNLICENSED'
  s.author         = 'Splashy Cam'
  s.homepage       = 'https://github.com/teddykr08/splashycam'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
